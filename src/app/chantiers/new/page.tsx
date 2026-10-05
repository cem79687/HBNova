import Link from "next/link";
import AppShell from "@/components/app-shell";
import ChantierForm from "@/components/chantier-form";
import { chantierErrorMessage } from "@/lib/chantiers";
import { createClient } from "@/lib/supabase/server";
import { createChantierAction } from "../actions";

export default async function NewChantierPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; erreur?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, nom")
    .is("archived_at", null)
    .order("nom", { ascending: true });
  const clients = (data ?? []) as { id: string; nom: string }[];

  return (
    <AppShell
      title="Nouveau chantier"
      actions={
        <Link href="/chantiers" className="text-sm font-medium hover:text-brand">
          Retour aux chantiers
        </Link>
      }
    >
      {clients.length === 0 ? (
        <div className="max-w-3xl rounded-xl border border-line bg-surface p-8 text-center">
          <p className="text-muted">
            Un chantier est rattaché à un client : créez d&apos;abord un client.
          </p>
          <Link
            href="/clients/new"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 font-semibold text-white dark:text-black"
          >
            Créer un client
          </Link>
        </div>
      ) : (
        <ChantierForm
          action={createChantierAction}
          clients={clients}
          defaultClientId={sp.client}
          submitLabel="Créer le chantier"
          error={chantierErrorMessage(sp.erreur)}
        />
      )}
    </AppShell>
  );
}
