"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  table: "devis" | "factures";
  id: string;
  userId: string;
  path: string | null;
  url: string | null;
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo, comme la limite du stockage

export default function PdfAttachment({ table, id, userId, path, url }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      setMessage("Choisissez un fichier PDF.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setMessage("Le fichier dépasse 10 Mo.");
      return;
    }
    if (!userId) {
      setMessage("Session introuvable. Reconnectez-vous.");
      return;
    }

    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    // Chaque envoi a un nom unique : pas de problème de cache à l'ouverture.
    const newPath = `${userId}/${table}/${id}-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(newPath, file, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      setMessage("L'envoi a échoué. Réessayez.");
      setBusy(false);
      return;
    }

    const { error: dbError } = await supabase
      .from(table)
      .update({ pdf_path: newPath })
      .eq("id", id);
    if (dbError) {
      await supabase.storage.from("documents").remove([newPath]);
      setMessage("L'enregistrement a échoué. Réessayez.");
      setBusy(false);
      return;
    }

    if (path) await supabase.storage.from("documents").remove([path]);
    setBusy(false);
    router.refresh();
  }

  async function onRemove() {
    if (!path) return;
    if (!window.confirm("Retirer ce PDF ?")) return;

    setBusy(true);
    setMessage(null);
    const supabase = createClient();

    const { error: dbError } = await supabase
      .from(table)
      .update({ pdf_path: null })
      .eq("id", id);
    if (dbError) {
      setMessage("Le retrait a échoué. Réessayez.");
      setBusy(false);
      return;
    }

    await supabase.storage.from("documents").remove([path]);
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="mt-8 max-w-3xl rounded-xl border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-semibold">Document PDF</h2>

      {url ? (
        <p className="mt-3 text-sm">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand hover:underline"
          >
            Ouvrir le PDF
          </a>{" "}
          <span className="text-muted">(lien valable 1 heure)</span>
        </p>
      ) : path ? (
        <p className="mt-3 text-sm text-muted">
          Le PDF est enregistré, mais son lien n&apos;a pas pu être créé.
          Rechargez la page.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Aucun PDF joint. Déposez ici le PDF exporté depuis Tiime.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium focus-within:border-brand hover:border-brand">
          {path ? "Remplacer le PDF" : "Ajouter un PDF"}
          <input
            type="file"
            accept="application/pdf"
            onChange={onFile}
            disabled={busy}
            className="sr-only"
          />
        </label>
        {path && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="rounded-lg border border-line px-4 py-2 text-sm hover:border-red-500 hover:text-red-600 disabled:opacity-60"
          >
            Retirer le PDF
          </button>
        )}
        {busy && <span className="text-sm text-muted">Traitement en cours...</span>}
      </div>

      {message && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {message}
        </p>
      )}
    </section>
  );
}
