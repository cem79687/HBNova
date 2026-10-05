import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/app-shell";
import ChantierForm from "@/components/chantier-form";
import {
  chantierErrorMessage,
  formatDate,
  formatDateTime,
  statutLabel,
  type Chantier,
  type ChantierStatutLog,
} from "@/lib/chantiers";
import {
  DEVIS_STATUTS,
  FACTURE_TYPES,
  PAIEMENT_STATUTS,
  formatMontant,
  labelOf,
  type Devis,
  type FactureSuivi,
} from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";
import { archiveChantierAction, updateChantierAction } from "../actions";

type FactureRow = Pick<
  FactureSuivi,
  | "id"
  | "numero"
  | "type"
  | "date_echeance"
  | "montant_ttc"
  | "montant_paye"
  | "statut_paiement"
>;
type DevisRow = Pick<
  Devis,
  "id" | "numero" | "statut" | "date_emission" | "montant_ttc"
>;

export default async function ChantierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("chantiers")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  const chantier = data as Chantier | null;
  if (!chantier) notFound();

  // Clients actifs, plus le client de ce chantier même s'il est archivé.
  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, nom")
    .or(`archived_at.is.null,id.eq.${chantier.client_id}`)
    .order("nom", { ascending: true });
  const clients = (clientRows ?? []) as { id: string; nom: string }[];
  const client = clients.find((c) => c.id === chantier.client_id);

  const { data: logRows } = await supabase
    .from("chantier_statuts")
    .select("id, ancien_statut, nouveau_statut, changed_at")
    .eq("chantier_id", id)
    .order("changed_at", { ascending: false });
  const history = (logRows ?? []) as ChantierStatutLog[];

  const { data: devisRows } = await supabase
    .from("devis")
    .select("id, numero, statut, date_emission, montant_ttc")
    .eq("chantier_id", id)
    .is("archived_at", null)
    .order("date_emission", { ascending: false });
  const devis = (devisRows ?? []) as DevisRow[];

  const { data: factureRows } = await supabase
    .from("factures_suivi")
    .select(
      "id, numero, type, date_echeance, montant_ttc, montant_paye, statut_paiement",
    )
    .eq("chantier_id", id)
    .is("archived_at", null)
    .order("date_emission", { ascending: false });
  const factures = (factureRows ?? []) as FactureRow[];

  const facture = factures.reduce((s, f) => s + Number(f.montant_ttc), 0);
  const encaisse = factures.reduce((s, f) => s + Number(f.montant_paye), 0);

  const card = "rounded-xl border border-line bg-surface p-4";
  const section = "mt-8 max-w-3xl rounded-xl border border-line bg-surface p-6";
  const addLink =
    "rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-brand";

  return (
    <AppShell
      title={chantier.intitule}
      subtitle={`${statutLabel(chantier.statut)}${client ? ` | ${client.nom}` : ""}`}
      actions={
        <Link href="/chantiers" className="text-sm font-medium hover:text-brand">
          Retour aux chantiers
        </Link>
      }
    >
      <section className="mb-6 grid max-w-3xl gap-4 sm:grid-cols-4">
        <div className={card}>
          <p className="text-sm text-muted">Budget estimé</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {formatMontant(chantier.budget_estime)}
          </p>
        </div>
        <div className={card}>
          <p className="text-sm text-muted">Facturé TTC</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {formatMontant(facture)}
          </p>
        </div>
        <div className={card}>
          <p className="text-sm text-muted">Encaissé</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {formatMontant(encaisse)}
          </p>
        </div>
        <div className={card}>
          <p className="text-sm text-muted">Reste à encaisser</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {formatMontant(facture - encaisse)}
          </p>
        </div>
      </section>

      <ChantierForm
        action={updateChantierAction.bind(null, id)}
        clients={clients}
        chantier={chantier}
        submitLabel="Enregistrer les modifications"
        error={chantierErrorMessage(sp.erreur)}
        notice={sp.ok ? "Modifications enregistrées." : undefined}
      />

      <section className={section}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Devis</h2>
          <Link href={`/devis/new?chantier=${id}`} className={addLink}>
            Ajouter un devis
          </Link>
        </div>
        {devis.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucun devis pour ce chantier.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {devis.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <Link href={`/devis/${d.id}`} className="font-medium hover:text-brand">
                  {d.numero}
                </Link>
                <span className="text-muted">
                  {formatDate(d.date_emission)} | {labelOf(DEVIS_STATUTS, d.statut)} |{" "}
                  <span className="font-medium text-foreground">
                    {formatMontant(d.montant_ttc)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={section}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Factures</h2>
          <Link href={`/factures/new?chantier=${id}`} className={addLink}>
            Ajouter une facture
          </Link>
        </div>
        {factures.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucune facture pour ce chantier.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {factures.map((f) => {
              const statut = PAIEMENT_STATUTS[f.statut_paiement];
              return (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <span>
                    <Link
                      href={`/factures/${f.id}`}
                      className="font-medium hover:text-brand"
                    >
                      {f.numero}
                    </Link>
                    <span className="text-muted">
                      {" "}
                      {labelOf(FACTURE_TYPES, f.type)} | échéance{" "}
                      {formatDate(f.date_echeance)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{formatMontant(f.montant_ttc)}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statut.className}`}
                    >
                      {statut.label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={section}>
        <h2 className="font-display text-lg font-semibold">
          Historique des statuts
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucun changement enregistré.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span>
                  {h.ancien_statut ? (
                    <>
                      {statutLabel(h.ancien_statut)} puis{" "}
                      <strong>{statutLabel(h.nouveau_statut)}</strong>
                    </>
                  ) : (
                    <>
                      Création, statut <strong>{statutLabel(h.nouveau_statut)}</strong>
                    </>
                  )}
                </span>
                <span className="text-muted">{formatDateTime(h.changed_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="mt-6 max-w-3xl rounded-xl border border-line bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Archiver ce chantier
        </summary>
        <p className="mt-3 text-sm text-muted">
          Le chantier disparaît du tableau. Ses données et son historique sont
          conservés dans la base.
        </p>
        <form action={archiveChantierAction.bind(null, id)} className="mt-3">
          <button
            type="submit"
            className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400"
          >
            Confirmer l&apos;archivage
          </button>
        </form>
      </details>
    </AppShell>
  );
}
