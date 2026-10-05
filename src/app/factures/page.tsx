import Link from "next/link";
import AppShell from "@/components/app-shell";
import { formatDate } from "@/lib/chantiers";
import {
  FACTURE_TYPES,
  PAIEMENT_STATUTS,
  formatMontant,
  labelOf,
  type FactureSuivi,
  type StatutPaiement,
} from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

type Row = Pick<
  FactureSuivi,
  | "id"
  | "numero"
  | "chantier_id"
  | "type"
  | "date_echeance"
  | "montant_ttc"
  | "reste_a_payer"
  | "statut_paiement"
>;
type ChantierRow = {
  id: string;
  intitule: string;
  clients: { nom: string } | null;
};

const STATUT_KEYS = Object.keys(PAIEMENT_STATUTS) as StatutPaiement[];

export default async function FacturesListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const statut = STATUT_KEYS.find((k) => k === sp.statut) ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("factures_suivi")
    .select(
      "id, numero, chantier_id, type, date_echeance, montant_ttc, reste_a_payer, statut_paiement",
      { count: "exact" },
    )
    .is("archived_at", null)
    .order("date_emission", { ascending: false })
    .order("numero", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (statut) query = query.eq("statut_paiement", statut);
  const safe = q.replace(/[%\\,()]/g, " ").trim();
  if (safe) query = query.ilike("numero", `%${safe}%`);

  const [{ data, count }, chantiersRes] = await Promise.all([
    query,
    supabase.from("chantiers").select("id, intitule, clients(nom)"),
  ]);

  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const chantiers = new Map(
    ((chantiersRes.data ?? []) as unknown as ChantierRow[]).map((c) => [
      c.id,
      c.clients?.nom ? `${c.intitule} | ${c.clients.nom}` : c.intitule,
    ]),
  );

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statut) params.set("statut", statut);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/factures?${s}` : "/factures";
  }

  const input =
    "rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

  return (
    <AppShell
      title="Factures"
      subtitle={`${total} facture${total > 1 ? "s" : ""}`}
      actions={
        <Link
          href="/factures/new"
          className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white dark:text-black"
        >
          Nouvelle facture
        </Link>
      }
    >
      <form className="mb-5 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher un numéro de facture"
          aria-label="Rechercher une facture"
          className={`${input} min-w-64 flex-1`}
        />
        <select
          name="statut"
          defaultValue={statut}
          aria-label="Filtrer par statut de paiement"
          className={input}
        >
          <option value="">Tous les statuts</option>
          {STATUT_KEYS.map((k) => (
            <option key={k} value={k}>
              {PAIEMENT_STATUTS[k].label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-line bg-surface px-4 py-2.5 font-medium hover:border-brand"
        >
          Rechercher
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center">
          <p className="text-muted">
            {q || statut
              ? "Aucune facture ne correspond."
              : "Aucune facture pour l'instant."}
          </p>
          {!q && !statut && (
            <Link
              href="/factures/new"
              className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 font-semibold text-white dark:text-black"
            >
              Ajouter votre première facture
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-4 py-3 font-medium">Numéro</th>
                <th className="px-4 py-3 font-medium">Chantier</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Type</th>
                <th className="px-4 py-3 font-medium">Échéance</th>
                <th className="px-4 py-3 text-right font-medium">Total TTC</th>
                <th className="px-4 py-3 text-right font-medium">Reste à payer</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => {
                const statutInfo = PAIEMENT_STATUTS[f.statut_paiement];
                return (
                  <tr key={f.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/factures/${f.id}`} className="hover:text-brand">
                        {f.numero}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3">
                      <Link
                        href={`/chantiers/${f.chantier_id}`}
                        className="hover:text-brand"
                      >
                        {chantiers.get(f.chantier_id) ?? "Chantier inconnu"}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {labelOf(FACTURE_TYPES, f.type)}
                    </td>
                    <td className="px-4 py-3">{formatDate(f.date_echeance)}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMontant(f.montant_ttc)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMontant(f.reste_a_payer)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statutInfo.className}`}
                      >
                        {statutInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="font-medium hover:text-brand">
              Page précédente
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} sur {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="font-medium hover:text-brand">
              Page suivante
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </AppShell>
  );
}
