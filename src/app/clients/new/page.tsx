import Link from "next/link";
import AppShell from "@/components/app-shell";
import ClientForm from "@/components/client-form";
import { createClientAction } from "../actions";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const sp = await searchParams;
  const error =
    sp.erreur === "1"
      ? "Le nom est obligatoire."
      : sp.erreur
        ? "L'enregistrement a échoué. Réessayez."
        : undefined;

  return (
    <AppShell
      title="Nouveau client"
      actions={
        <Link href="/clients" className="text-sm font-medium hover:text-brand">
          Retour à la liste
        </Link>
      }
    >
      <ClientForm
        action={createClientAction}
        submitLabel="Créer le client"
        error={error}
      />
    </AppShell>
  );
}
