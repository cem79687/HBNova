import Link from "next/link";
import AppShell from "@/components/app-shell";
import DevisForm from "@/components/devis-form";
import { createDevisAction } from "@/app/documents/actions";
import { documentErrorMessage } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type ChantierRow = { id: string; intitule: string; clients: { nom: string } | null };

export default async function NewDevisPage({
  searchParams,
}: {
  searchParams: Promise<{ chantier?: string; erreur?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("chantiers")
    .select("id, intitule, clients(nom)")
    .is("archived_at", null)
    .order("intitule", { ascending: true });
  const chantiers = ((data ?? []) as unknown as ChantierRow[]).map((c) => ({
    id: c.id,
    label: `${c.intitule} (${c.clients?.nom ?? "client inconnu"})`,
  }));

  return (
    <AppShell
      title="Nouveau devis"
      actions={
        <Link
          href={sp.chantier ? `/chantiers/${sp.chantier}` : "/chantiers"}
          className="text-sm font-medium hover:text-brand"
        >
          Retour au chantier
        </Link>
      }
    >
      {chantiers.length === 0 ? (
        <div className="max-w-3xl rounded-xl border border-line bg-surface p-8 text-center">
          <p className="text-muted">
            Un devis est rattaché à un chantier : créez d&apos;abord un chantier.
          </p>
          <Link
            href="/chantiers/new"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 font-semibold text-white dark:text-black"
          >
            Créer un chantier
          </Link>
        </div>
      ) : (
        <DevisForm
          action={createDevisAction}
          chantiers={chantiers}
          defaultChantierId={sp.chantier}
          submitLabel="Enregistrer le devis"
          error={documentErrorMessage(sp.erreur)}
        />
      )}
    </AppShell>
  );
}
