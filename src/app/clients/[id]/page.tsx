import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/app-shell";
import ClientForm from "@/components/client-form";
import { formatEuro, statutLabel } from "@/lib/chantiers";
import { createClient } from "@/lib/supabase/server";
import type { Client, Contact } from "@/lib/types";
import {
  addContactAction,
  archiveClientAction,
  deleteContactAction,
  updateClientAction,
} from "../actions";

const field =
  "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

type ChantierRow = {
  id: string;
  intitule: string;
  statut: string;
  budget_estime: number | null;
};

export default async function ClientPage({
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
    .from("clients")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  const client = data as Client | null;
  if (!client) notFound();

  const { data: contactRows } = await supabase
    .from("contacts")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: true });
  const contacts = (contactRows ?? []) as Contact[];

  const { data: chantierRows } = await supabase
    .from("chantiers")
    .select("id, intitule, statut, budget_estime")
    .eq("client_id", id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  const chantiers = (chantierRows ?? []) as ChantierRow[];

  const error =
    sp.erreur === "1"
      ? "Le nom est obligatoire."
      : sp.erreur
        ? "L'enregistrement a échoué. Réessayez."
        : undefined;

  return (
    <AppShell
      title={client.nom}
      subtitle={client.type === "professionnel" ? "Client professionnel" : "Client particulier"}
      actions={
        <Link href="/clients" className="text-sm font-medium hover:text-brand">
          Retour à la liste
        </Link>
      }
    >
      <ClientForm
        action={updateClientAction.bind(null, id)}
        client={client}
        submitLabel="Enregistrer les modifications"
        error={error}
        notice={sp.ok ? "Modifications enregistrées." : undefined}
      />

      <section className="mt-8 max-w-3xl rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Chantiers</h2>
          <Link
            href={`/chantiers/new?client=${id}`}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-brand"
          >
            Nouveau chantier
          </Link>
        </div>
        {chantiers.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Aucun chantier rattaché à ce client.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {chantiers.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <Link href={`/chantiers/${c.id}`} className="font-medium hover:text-brand">
                  {c.intitule}
                </Link>
                <span className="text-muted">
                  {statutLabel(c.statut)} | {formatEuro(c.budget_estime)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 max-w-3xl rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Contacts</h2>

        {contacts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucun contact enregistré.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {c.nom}
                    {c.fonction ? (
                      <span className="font-normal text-muted"> ({c.fonction})</span>
                    ) : null}
                  </p>
                  <p className="text-muted">
                    {[c.telephone, c.email].filter(Boolean).join(" | ") || "Aucune coordonnée"}
                  </p>
                </div>
                <form action={deleteContactAction.bind(null, id, c.id)}>
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
          action={addContactAction.bind(null, id)}
          className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2"
        >
          <div>
            <label htmlFor="c-nom" className="text-sm font-medium">
              Nom du contact
            </label>
            <input id="c-nom" name="nom" required className={field} />
          </div>
          <div>
            <label htmlFor="c-fonction" className="text-sm font-medium">
              Fonction
            </label>
            <input id="c-fonction" name="fonction" className={field} />
          </div>
          <div>
            <label htmlFor="c-tel" className="text-sm font-medium">
              Téléphone
            </label>
            <input id="c-tel" name="telephone" type="tel" className={field} />
          </div>
          <div>
            <label htmlFor="c-email" className="text-sm font-medium">
              Adresse e-mail
            </label>
            <input id="c-email" name="email" type="email" className={field} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-brand"
            >
              Ajouter le contact
            </button>
          </div>
        </form>
      </section>

      <details className="mt-6 max-w-3xl rounded-xl border border-line bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Archiver ce client
        </summary>
        <p className="mt-3 text-sm text-muted">
          Le client disparaît des listes. Ses données sont conservées dans la
          base.
        </p>
        <form action={archiveClientAction.bind(null, id)} className="mt-3">
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
