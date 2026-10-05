import Link from "next/link";
import AppShell from "@/components/app-shell";
import { formatDate } from "@/lib/chantiers";
import {
  DEVIS_STATUTS,
  formatMontant,
  labelOf,
  type Devis,
} from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

const PILL: Record<string, string> = {
  envoye: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  accepte: "bg-green-500/15 text-green-700 dark:text-green-400",
  refuse: "bg-red-500/15 text-red-700 dark:text-red-400",
  expire: "bg-background text-muted",
};

type Row = Pick<
  Devis,
  | "id"
  | "numero"
  | "chantier_id"
  | "statut"
  | "date_emission"
  | "date_validite"
  | "montant_ttc"
>;
type ChantierRow = {
  id: string;
  intitule: string;
  clients: { nom: string } | null;
};

export default async function DevisListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const statut = DEVIS_STATUTS.some((s) => s.value === sp.statut)
    ? (sp.statut as string)
    : "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("devis")
    .select(
      "id, numero, chantier_id, statut, date_emission, date_validite, montant_ttc",
      { count: "exact" },
    )
    .is("archived_at", null)
    .order("date_emission", { ascending: false })
    .order("numero", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (statut) query = query.eq("statut", statut);
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
    return s ? `/devis?${s}` : "/devis";
  }

  const input =
    "rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

  return (
    <AppShell
      title="Devis"
      subtitle={`${total} devis`}
      actions={
        <Link
          href="/devis/new"
          className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white dark:text-black"
        >
          Nouveau devis
        </Link>
      }
    >
      <form className="mb-5 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher un numéro de devis"
          aria-label="Rechercher un devis"
          className={`${input} min-w-64 flex-1`}
        />
        <select
          name="statut"
          defaultValue={statut}
          aria-label="Filtrer par statut"
          className={input}
        >
          <option value="">Tous les statuts</option>
          {DEVIS_STATUTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
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
            {q || statut ? "Aucun devis ne correspond." : "Aucun devis pour l'instant."}
          </p>
          {!q && !statut && (
            <Link
              href="/devis/new"
              className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 font-semibold text-white dark:text-black"
            >
              Ajouter votre premier devis
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-4 py-3 font-medium">Numéro</th>
                <th className="px-4 py-3 font-medium">Chantier</th>
                <th className="px-4 py-3 font-medium">Émission</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Validité</th>
                <th className="px-4 py-3 text-right font-medium">Total TTC</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/devis/${d.id}`} className="hover:text-brand">
                      {d.numero}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3">
                    <Link
                      href={`/chantiers/${d.chantier_id}`}
                      className="hover:text-brand"
                    >
                      {chantiers.get(d.chantier_id) ?? "Chantier inconnu"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatDate(d.date_emission)}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {formatDate(d.date_validite)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatMontant(d.montant_ttc)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL[d.statut] ?? PILL.expire}`}
                    >
                      {labelOf(DEVIS_STATUTS, d.statut)}
                    </span>
                  </td>
                </tr>
              ))}
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
