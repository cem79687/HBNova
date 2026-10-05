import AppShell from "@/components/app-shell";
import SecurityPanel from "@/components/security-panel";

export default function SecuritePage() {
  return (
    <AppShell
      title="Sécurité"
      subtitle="Double authentification par application"
    >
      <SecurityPanel />
    </AppShell>
  );
}
