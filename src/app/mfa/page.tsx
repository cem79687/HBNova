import { signOut } from "@/app/actions";
import GlassShell from "@/components/glass-shell";
import MfaChallenge from "@/components/mfa-challenge";

// On n'accepte que des adresses internes à l'application.
function safeNext(value?: string): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;

  return (
    <GlassShell
      title="Vérification en deux étapes"
      subtitle="Saisissez le code affiché par votre application d'authentification."
    >
      <MfaChallenge next={safeNext(sp.next)} />

      <form action={signOut}>
        <button type="submit" className="glass-link">
          Se déconnecter
        </button>
      </form>
    </GlassShell>
  );
}
