import Link from "next/link";
import AppShell from "@/components/app-shell";
import StatusSelect from "@/components/status-select";
import { STATUTS, formatDate, formatEuro } from "@/lib/chantiers";
import { createClient } from "@/lib/supabase/server";
import { moveChantierAction } from "./actions";

type Row = {
  id: string;
  intitule: string;
  statut: string;
  budget_estime: number | null;
  date_debut: string | null;
  clients: { nom: string } | null;
};

export default async function ChantiersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chantiers")
    .select("id, intitule, statut, budget_estime, date_debut, clients(nom)")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];
  const total = rows.length;

  return (
    <AppShell
      title="Chantiers"
      subtitle={`${total} chantier${total > 1 ? "s" : ""} actif${total > 1 ? "s" : ""}`}
      actions={
        <Link
          href="/chantiers/new"
          className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white dark:text-black"
        >
          Nouveau chantier
        </Link>
      }
    >
      <div className="grid grid-cols-[repeat(6,minmax(240px,1fr))] gap-4 overflow-x-auto pb-4">
        {STATUTS.map((col) => {
          const items = rows.filter((r) => r.statut === col.value);
          const budget = items.reduce((sum, r) => sum + (r.budget_estime ?? 0), 0);

          return (
            <section key={col.value} aria-label={col.label}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="font-display text-sm font-semibold">
                  {col.label}{" "}
                  <span className="font-normal text-muted">({items.length})</span>
                </h2>
                {budget > 0 && (
                  <span className="text-xs text-muted">{formatEuro(budget)}</span>
                )}
              </div>
              <div className="grid min-h-24 content-start gap-3 rounded-xl bg-black/[0.04] p-2.5 dark:bg-white/[0.04]">
                {items.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-lg border border-line border-l-[3px] border-l-brand bg-surface p-3 text-sm"
                  >
                    <Link
                      href={`/chantiers/${r.id}`}
                      className="block font-semibold hover:text-brand"
                    >
                      {r.intitule}
                    </Link>
                    <p className="text-muted">{r.clients?.nom ?? "Client inconnu"}</p>
                    <p className="mt-2 flex justify-between text-xs">
                      <span className="font-medium">{formatEuro(r.budget_estime)}</span>
                      <span className="text-muted">
                        {r.date_debut ? `Début ${formatDate(r.date_debut)}` : ""}
                      </span>
                    </p>
                    <div className="mt-3">
                      <StatusSelect
                        id={r.id}
                        statut={r.statut}
                        action={moveChantierAction}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-muted">
        Changez le statut d&apos;un chantier avec la liste déroulante de sa carte.
      </p>
    </AppShell>
  );
}
