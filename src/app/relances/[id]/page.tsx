import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/app-shell";
import CopyButton from "@/components/copy-button";
import { formatDate } from "@/lib/chantiers";
import {
  PAIEMENT_STATUTS,
  formatMontant,
  type FactureSuivi,
} from "@/lib/documents";
import {
  CANAUX,
  NIVEAUX,
  buildMessages,
  daysBetween,
  niveauLabel,
  parisDate,
  relanceMessage,
  suggestedLevel,
  type Niveau,
  type Relance,
} from "@/lib/relances";
import { createClient } from "@/lib/supabase/server";
import { deleteRelanceAction, logRelanceAction } from "../actions";

type ChantierRow = {
  id: string;
  intitule: string;
  clients: {
    id: string;
    nom: string;
    type: "particulier" | "professionnel";
    email: string | null;
    telephone: string | null;
  } | null;
};

const area =
  "mt-2 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm outline-none focus:border-brand";

export default async function RelancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ niveau?: string; ok?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const today = parisDate(new Date());

  const supabase = await createClient();
  const { data } = await supabase
    .from("factures_suivi")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  const facture = data as FactureSuivi | null;
  if (!facture) notFound();

  const { data: chantierData } = await supabase
    .from("chantiers")
    .select("id, intitule, clients(id, nom, type, email, telephone)")
    .eq("id", facture.chantier_id)
    .maybeSingle();
  const chantier = chantierData as unknown as ChantierRow | null;
  const client = chantier?.clients ?? null;

  const { data: relanceRows } = await supabase
    .from("relances")
    .select("id, facture_id, niveau, canal, envoyee_le")
    .eq("facture_id", id)
    .order("envoyee_le", { ascending: false });
  const relances = (relanceRows ?? []) as Relance[];

  const reste = Number(facture.reste_a_payer);
  const jours = Math.max(0, daysBetween(facture.date_echeance, today));
  const last = relances[0];
  const lastDate = last ? parisDate(new Date(last.envoyee_le)) : null;
  const conseille = suggestedLevel(
    jours,
    last ? last.niveau : null,
    lastDate ? daysBetween(lastDate, today) : null,
  );

  const demande = Number(sp.niveau);
  const niveau = ([1, 2, 3] as const).includes(demande as Niveau)
    ? (demande as Niveau)
    : conseille;

  const messages = buildMessages(niveau, {
    clientType: client?.type ?? "particulier",
    numero: facture.numero,
    reste,
    echeance: formatDate(facture.date_echeance),
    joursRetard: jours,
  });

  const mailto = `mailto:${client?.email ?? ""}?subject=${encodeURIComponent(messages.subject)}&body=${encodeURIComponent(messages.email)}`;
  const smsLink = `sms:${client?.telephone ?? ""}?&body=${encodeURIComponent(messages.sms)}`;

  const canauxDisponibles =
    niveau === 3
      ? CANAUX.filter((c) => c.value === "courrier" || c.value === "telephone")
      : CANAUX.filter((c) => c.value !== "courrier");

  const { error, notice } = relanceMessage(sp.erreur, sp.ok);
  const statut = PAIEMENT_STATUTS[facture.statut_paiement];
  const card = "rounded-xl border border-line bg-surface p-4";
  const action =
    "inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white dark:text-black";

  return (
    <AppShell
      title={`Relance de la facture ${facture.numero}`}
      subtitle={client?.nom ?? "Client inconnu"}
      actions={
        <Link href="/relances" className="text-sm font-medium hover:text-brand">
          Retour aux relances
        </Link>
      }
    >
      {error && (
        <p
          role="alert"
          className="mb-4 max-w-3xl rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-4 max-w-3xl rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400"
        >
          {notice}
        </p>
      )}
      {facture.statut_paiement === "payee" && (
        <p className="mb-4 max-w-3xl rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          Cette facture est entièrement payée : il n&apos;y a plus rien à relancer.
        </p>
      )}

      <section className="mb-6 grid max-w-3xl gap-4 sm:grid-cols-4">
        <div className={card}>
          <p className="text-sm text-muted">Reste à payer</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {formatMontant(reste)}
          </p>
        </div>
        <div className={card}>
          <p className="text-sm text-muted">Échéance</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {formatDate(facture.date_echeance)}
          </p>
          <p className="text-xs text-muted">{jours} jour{jours > 1 ? "s" : ""} de retard</p>
        </div>
        <div className={card}>
          <p className="text-sm text-muted">Statut</p>
          <p className="mt-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statut.className}`}
            >
              {statut.label}
            </span>
          </p>
        </div>
        <div className={card}>
          <p className="text-sm text-muted">Dernière relance</p>
          <p className="mt-1 text-sm font-medium">
            {last && lastDate
              ? `${niveauLabel(last.niveau)}, le ${formatDate(lastDate)}`
              : "Aucune"}
          </p>
        </div>
      </section>

      <nav aria-label="Niveau de relance" className="mb-4 flex max-w-3xl flex-wrap gap-2">
        {NIVEAUX.map((n) => {
          const active = n.value === niveau;
          return (
            <Link
              key={n.value}
              href={`/relances/${id}?niveau=${n.value}`}
              aria-current={active ? "true" : undefined}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                active
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line hover:border-brand"
              }`}
            >
              {n.value}. {n.label}
              {n.value === conseille ? " (conseillé)" : ""}
            </Link>
          );
        })}
      </nav>

      {niveau === 3 ? (
        <section className="max-w-3xl rounded-xl border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-semibold">
            Courrier de mise en demeure
          </h2>
          <p className="mt-1 text-sm text-muted">
            À envoyer en lettre recommandée avec accusé de réception. Ce modèle
            est indicatif : faites-le relire avant l&apos;envoi, notamment pour
            un client particulier.
          </p>
          <textarea readOnly rows={14} defaultValue={messages.email} className={area} />
          <div className="mt-3">
            <CopyButton text={messages.email} label="Copier le courrier" />
          </div>
        </section>
      ) : (
        <div className="grid max-w-3xl gap-6">
          <section className="rounded-xl border border-line bg-surface p-6">
            <h2 className="font-display text-lg font-semibold">E-mail</h2>
            <p className="mt-1 text-sm text-muted">
              Destinataire : {client?.email ?? "aucune adresse e-mail enregistrée pour ce client"}
            </p>
            <p className="mt-3 text-sm font-medium">Objet : {messages.subject}</p>
            <textarea readOnly rows={11} defaultValue={messages.email} className={area} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a href={mailto} className={action}>
                Ouvrir dans ma messagerie
              </a>
              <CopyButton text={messages.email} />
            </div>
          </section>

          <section className="rounded-xl border border-line bg-surface p-6">
            <h2 className="font-display text-lg font-semibold">SMS</h2>
            <p className="mt-1 text-sm text-muted">
              Destinataire : {client?.telephone ?? "aucun téléphone enregistré pour ce client"}
            </p>
            <textarea readOnly rows={4} defaultValue={messages.sms} className={area} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a href={smsLink} className={action}>
                Ouvrir dans Messages
              </a>
              <CopyButton text={messages.sms} />
            </div>
            <p className="mt-2 text-xs text-muted">
              Le bouton SMS fonctionne surtout depuis un téléphone.
            </p>
          </section>
        </div>
      )}

      <section className="mt-6 max-w-3xl rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">
          Enregistrer l&apos;envoi
        </h2>
        <p className="mt-1 text-sm text-muted">
          Une fois le message envoyé, notez-le dans le journal :{" "}
          {niveauLabel(niveau)}.
        </p>
        <form
          action={logRelanceAction.bind(null, id)}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="niveau" value={niveau} />
          <div>
            <label htmlFor="canal" className="text-sm font-medium">
              Moyen utilisé
            </label>
            <select
              id="canal"
              name="canal"
              defaultValue={niveau === 3 ? "courrier" : "email"}
              className="mt-1 block rounded-lg border border-line bg-background px-3 py-2.5 outline-none focus:border-brand"
            >
              {canauxDisponibles.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={action}>
            J&apos;ai envoyé cette relance
          </button>
        </form>
      </section>

      <section className="mt-6 max-w-3xl rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Journal des relances</h2>
        {relances.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucune relance enregistrée.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {relances.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span>
                  <span className="font-medium">{niveauLabel(r.niveau)}</span>
                  <span className="text-muted">
                    {" "}
                    par {CANAUX.find((c) => c.value === r.canal)?.label ?? r.canal}, le{" "}
                    {formatDate(parisDate(new Date(r.envoyee_le)))}
                  </span>
                </span>
                <form action={deleteRelanceAction.bind(null, id, r.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-red-500 hover:text-red-600"
                  >
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
