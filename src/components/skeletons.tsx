import AppShell from "@/components/app-shell";

// Squelette du tableau de bord (sans la barre latérale)
export function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Chargement en cours
      </span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="skeleton mt-6 h-72" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-80" />
        <div className="skeleton h-80" />
      </div>
    </div>
  );
}

// Squelette d'une page de liste (recherche, puis lignes)
export function ListSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Chargement en cours
      </span>
      <div className="mb-5 flex gap-3">
        <div className="skeleton h-11 flex-1" />
        <div className="skeleton h-11 w-40" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton h-14" />
        ))}
      </div>
    </div>
  );
}

// Page complète affichée pendant le chargement d'une section
export async function PageSkeleton() {
  return (
    <AppShell title="Chargement" subtitle="Un instant...">
      <ListSkeleton />
    </AppShell>
  );
}
