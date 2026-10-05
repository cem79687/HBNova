import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/app-shell";
import FactureForm from "@/components/facture-form";
import PdfAttachment from "@/components/pdf-attachment";
import {
  addPaiementAction,
  archiveFactureAction,
  deletePaiementAction,
  updateFactureAction,
} from "@/app/documents/actions";
import { formatDate } from "@/lib/chantiers";
import {
  PAIEMENT_MODES,
  PAIEMENT_STATUTS,
  documentErrorMessage,
  formatMontant,
  labelOf,
  todayISO,
  type FactureSuivi,
  type Paiement,
} from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type ChantierRow = { id: string; intitule: string; clients: { nom: string } | null };

const NOTICES: Record<string, string> = {
  "1": "Modifications enregistrées.",
  "2": "Paiement enregistré.",
  "3": "Paiement supprimé.",
};

const field =
  "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

export default async function FacturePage({
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
    .from("factures_suivi")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  const facture = data as FactureSuivi | null;
  if (!facture) notFound();

  const { data: rows } = await supabase
    .from("chantiers")
    .select("id, intitule, clients(nom)")
    .or(`archived_at.is.null,id.eq.${facture.chantier_id}`)
    .order("intitule", { ascending: true });
  const chantiers = ((rows ?? []) as unknown as ChantierRow[]).map((c) => ({
    id: c.id,
    label: `${c.intitule} (${c.clients?.nom ?? "client inconnu"})`,
  }));

  const { data: payRows } = await supabase
    .from("paiements")
    .select("id, facture_id, date_paiement, montant, mode")
    .eq("facture_id", id)
    .order("date_paiement", { ascending: false });
  const paiements = (payRows ?? []) as Paiement[];

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = (claimsData?.claims as { sub?: string } | undefined)?.sub ?? "";

  let pdfUrl: string | null = null;
  if (facture.pdf_path) {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(facture.pdf_path, 3600);
    pdfUrl = signed?.signedUrl ?? null;
  }

  const statut = PAIEMENT_STATUTS[facture.statut_paiement];
  const reste = Number(facture.reste_a_payer);

  return (
    <AppShell
      title={`Facture ${facture.numero}`}
      actions={
        <Link
          href={`/chantiers/${facture.chantier_id}`}
          className="text-sm font-medium hover:text-brand"
        >
          Retour au chantier
        </Link>
      }
    >
      <section className="mb-6 grid max-w-3xl gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Total TTC</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {formatMontant(facture.montant_ttc)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Déjà payé</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {formatMontant(facture.montant_paye)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Reste à payer</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {formatMontant(reste)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Statut</p>
          <p className="mt-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statut.className}`}
            >
              {statut.label}
            </span>
          </p>
        </div>
      </section>

      <FactureForm
        action={updateFactureAction.bind(null, id)}
        chantiers={chantiers}
        facture={facture}
        submitLabel="Enregistrer les modifications"
        error={documentErrorMessage(sp.erreur)}
        notice={sp.ok ? NOTICES[sp.ok] : undefined}
      />

      <PdfAttachment
        table="factures"
        id={id}
        userId={userId}
        path={facture.pdf_path}
        url={pdfUrl}
      />

      <section className="mt-8 max-w-3xl rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Paiements reçus</h2>

        {paiements.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucun paiement enregistré.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {paiements.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{formatMontant(p.montant)}</span>
                  <span className="text-muted">
                    {" "}
                    le {formatDate(p.date_paiement)} | {labelOf(PAIEMENT_MODES, p.mode)}
                  </span>
                </span>
                <form action={deletePaiementAction.bind(null, id, p.id)}>
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

        <form
          action={addPaiementAction.bind(null, id)}
          className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-3"
        >
          <div>
            <label htmlFor="p-date" className="text-sm font-medium">
              Date du paiement
            </label>
            <input
              id="p-date"
              name="date_paiement"
              type="date"
              required
              defaultValue={todayISO()}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="p-montant" className="text-sm font-medium">
              Montant (en euros)
            </label>
            <input
              id="p-montant"
              name="montant"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              required
              defaultValue={reste > 0 ? reste.toFixed(2) : ""}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="p-mode" className="text-sm font-medium">
              Mode de paiement
            </label>
            <select id="p-mode" name="mode" defaultValue="virement" className={field}>
              {PAIEMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-brand"
            >
              Enregistrer le paiement
            </button>
          </div>
        </form>
      </section>

      <details className="mt-6 max-w-3xl rounded-xl border border-line bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Archiver cette facture
        </summary>
        <p className="mt-3 text-sm text-muted">
          La facture disparaît du chantier et des totaux. Ses données et ses
          paiements sont conservés dans la base, et son numéro reste réservé.
        </p>
        <form
          action={archiveFactureAction.bind(null, id, facture.chantier_id)}
          className="mt-3"
        >
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
