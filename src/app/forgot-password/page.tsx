import Link from "next/link";
import ForgotPasswordForm from "@/components/forgot-password-form";
import GlassShell from "@/components/glass-shell";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const sp = await searchParams;

  return (
    <GlassShell
      title="Mot de passe oublié"
      subtitle="Nous vous envoyons un lien pour choisir un nouveau mot de passe."
    >
      {sp.erreur === "lien" && (
        <p role="alert" className="glass-error mb-4 text-sm">
          Ce lien n&apos;est plus valide ou a déjà été utilisé. Demandez-en un
          nouveau.
        </p>
      )}

      <ForgotPasswordForm />

      <Link href="/login" className="glass-link">
        Retour à la connexion
      </Link>
    </GlassShell>
  );
}
