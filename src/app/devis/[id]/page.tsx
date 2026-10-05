import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/app-shell";
import DevisForm from "@/components/devis-form";
import PdfAttachment from "@/components/pdf-attachment";
import { archiveDevisAction, updateDevisAction } from "@/app/documents/actions";
import { documentErrorMessage, type Devis } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type ChantierRow = { id: string; intitule: string; clients: { nom: string } | null };

export default async function DevisPage({
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
    .from("devis")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  const devis = data as Devis | null;
  if (!devis) notFound();

  const { data: rows } = await supabase
    .from("chantiers")
    .select("id, intitule, clients(nom)")
    .or(`archived_at.is.null,id.eq.${devis.chantier_id}`)
    .order("intitule", { ascending: true });
  const chantiers = ((rows ?? []) as unknown as ChantierRow[]).map((c) => ({
    id: c.id,
    label: `${c.intitule} (${c.clients?.nom ?? "client inconnu"})`,
  }));

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = (claimsData?.claims as { sub?: string } | undefined)?.sub ?? "";

  let pdfUrl: string | null = null;
  if (devis.pdf_path) {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(devis.pdf_path, 3600);
    pdfUrl = signed?.signedUrl ?? null;
  }

  return (
    <AppShell
      title={`Devis ${devis.numero}`}
      actions={
        <Link
          href={`/chantiers/${devis.chantier_id}`}
          className="text-sm font-medium hover:text-brand"
        >
          Retour au chantier
        </Link>
      }
    >
      <DevisForm
        action={updateDevisAction.bind(null, id)}
        chantiers={chantiers}
        devis={devis}
        submitLabel="Enregistrer les modifications"
        error={documentErrorMessage(sp.erreur)}
        notice={sp.ok ? "Modifications enregistrées." : undefined}
      />

      <PdfAttachment
        table="devis"
        id={id}
        userId={userId}
        path={devis.pdf_path}
        url={pdfUrl}
      />

      <details className="mt-6 max-w-3xl rounded-xl border border-line bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Archiver ce devis
        </summary>
        <p className="mt-3 text-sm text-muted">
          Le devis disparaît du chantier. Ses données sont conservées dans la
          base et son numéro reste réservé.
        </p>
        <form
          action={archiveDevisAction.bind(null, id, devis.chantier_id)}
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
