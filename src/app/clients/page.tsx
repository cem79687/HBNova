import Link from "next/link";
import AppShell from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";

const PAGE_SIZE = 25;

type Row = Pick<
  Client,
  "id" | "type" | "nom" | "telephone" | "email" | "adresse_chantier"
>;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const type =
    sp.type === "particulier" || sp.type === "professionnel" ? sp.type : "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, type, nom, telephone, email, adresse_chantier", {
      count: "exact",
    })
    .is("archived_at", null)
    .order("nom", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (type) query = query.eq("type", type);

  // On retire les caractères qui casseraient le filtre de recherche.
  const safe = q.replace(/[,()%*\\]/g, " ").trim();
  if (safe) {
    query = query.or(
      `nom.ilike.%${safe}%,telephone.ilike.%${safe}%,email.ilike.%${safe}%`,
    );
  }

  const { data, count } = await query;
  const clients = (data ?? []) as Row[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/clients?${s}` : "/clients";
  }

  const input =
    "rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

  return (
    <AppShell
      title="Clients"
      subtitle={`${total} client${total > 1 ? "s" : ""}`}
      actions={
        <Link
          href="/clients/new"
          className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white dark:text-black"
        >
          Nouveau client
        </Link>
      }
    >
      <form className="mb-5 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher un nom, un téléphone, un e-mail"
          aria-label="Rechercher un client"
          className={`${input} min-w-64 flex-1`}
        />
        <select
          name="type"
          defaultValue={type}
          aria-label="Filtrer par type"
          className={input}
        >
          <option value="">Tous les types</option>
          <option value="particulier">Particuliers</option>
          <option value="professionnel">Professionnels</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-line bg-surface px-4 py-2.5 font-medium hover:border-brand"
        >
          Rechercher
        </button>
      </form>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center">
          <p className="text-muted">
            {q || type ? "Aucun client ne correspond." : "Aucun client pour l'instant."}
          </p>
          {!q && !type && (
            <Link
              href="/clients/new"
              className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 font-semibold text-white dark:text-black"
            >
              Ajouter votre premier client
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Téléphone</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">
                  E-mail
                </th>
                <th className="hidden px-4 py-3 font-medium xl:table-cell">
                  Chantier
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/clients/${c.id}`} className="hover:text-brand">
                      {c.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-muted">
                      {c.type === "professionnel" ? "Professionnel" : "Particulier"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.telephone ?? "-"}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {c.email ?? "-"}
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 xl:table-cell">
                    {c.adresse_chantier ?? "-"}
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
