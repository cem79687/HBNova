import Link from "next/link";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import AppShell from "@/components/app-shell";
import CountUp from "@/components/count-up";
import MonthlyChart, { type MonthPoint } from "@/components/monthly-chart";
import { DashboardSkeleton } from "@/components/skeletons";
import { formatDate } from "@/lib/chantiers";
import {
  DEVIS_STATUTS,
  PAIEMENT_STATUTS,
  formatMontant,
  labelOf,
  type Devis,
  type FactureSuivi,
} from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

type FactureRow = Pick<
  FactureSuivi,
  | "id"
  | "numero"
  | "chantier_id"
  | "type"
  | "date_emission"
  | "date_echeance"
  | "montant_ttc"
  | "montant_paye"
  | "reste_a_payer"
  | "statut_paiement"
>;
type DevisRow = Pick<
  Devis,
  | "id"
  | "numero"
  | "chantier_id"
  | "statut"
  | "date_emission"
  | "date_validite"
  | "montant_ttc"
>;
type ChantierRow = {
  id: string;
  intitule: string;
  clients: { nom: string } | null;
};

const DEVIS_PILL: Record<string, string> = {
  envoye: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  accepte: "bg-green-500/15 text-green-700 dark:text-green-400",
  refuse: "bg-red-500/15 text-red-700 dark:text-red-400",
  expire: "bg-background text-muted",
};

function parisDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

// Décalage d'apparition : 0, 1, 2... (70 ms par rang)
function delay(rank: number): CSSProperties {
  return { "--d": rank } as CSSProperties;
}

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
  rank,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent: string;
  rank: number;
}) {
  return (
    <div
      style={delay(rank)}
      className={`fade-up lift rounded-xl border border-line border-l-[3px] bg-surface p-4 ${accent}`}
    >
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function Home() {
  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date());

  return (
    <AppShell
      title="Tableau de bord"
      subtitle={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
    >
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </AppShell>
  );
}

async function DashboardContent() {
  const today = parisDate(new Date());
  const inSevenDays = parisDate(new Date(Date.now() + 7 * 24 * 3600 * 1000));
  const [year, month] = today.split("-").map(Number);

  // 12 derniers mois, du plus ancien au mois en cours
  const months: MonthPoint[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (11 - i), 1));
    return {
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" })
        .format(d)
        .replace(".", ""),
      facture: 0,
      encaisse: 0,
    };
  });
  const byKey = new Map(months.map((m) => [m.key, m]));
  const rangeStart = `${months[0].key}-01`;

  const supabase = await createClient();
  const [facturesRes, devisRes, paiementsRes, chantiersRes] = await Promise.all([
    supabase
      .from("factures_suivi")
      .select(
        "id, numero, chantier_id, type, date_emission, date_echeance, montant_ttc, montant_paye, reste_a_payer, statut_paiement",
      )
      .is("archived_at", null),
    supabase
      .from("devis")
      .select("id, numero, chantier_id, statut, date_emission, date_validite, montant_ttc")
      .is("archived_at", null),
    supabase
      .from("paiements")
      .select("montant, date_paiement")
      .gte("date_paiement", rangeStart),
    supabase.from("chantiers").select("id, intitule, clients(nom)"),
  ]);

  const factures = (facturesRes.data ?? []) as FactureRow[];
  const devis = (devisRes.data ?? []) as DevisRow[];
  const paiements = (paiementsRes.data ?? []) as {
    montant: number;
    date_paiement: string;
  }[];
  const chantiers = (chantiersRes.data ?? []) as unknown as ChantierRow[];

  const chantierLabel = new Map(
    chantiers.map((c) => [
      c.id,
      c.clients?.nom ? `${c.intitule} | ${c.clients.nom}` : c.intitule,
    ]),
  );

  for (const f of factures) {
    const m = byKey.get(f.date_emission.slice(0, 7));
    if (m) m.facture += Number(f.montant_ttc);
  }
  for (const p of paiements) {
    const m = byKey.get(p.date_paiement.slice(0, 7));
    if (m) m.encaisse += Number(p.montant);
  }
  const current = months[months.length - 1];

  const sum = <T,>(items: T[], pick: (item: T) => number) =>
    items.reduce((total, item) => total + Number(pick(item)), 0);

  const impayees = factures.filter((f) => f.statut_paiement !== "payee");
  const resteTotal = sum(impayees, (f) => f.reste_a_payer);
  const enRetard = impayees.filter((f) => f.statut_paiement === "en_retard");
  const resteRetard = sum(enRetard, (f) => f.reste_a_payer);

  const devisAttente = devis.filter((d) => d.statut === "envoye");
  const totalAttente = sum(devisAttente, (d) => d.montant_ttc);
  const expirantBientot = devisAttente.filter(
    (d) => d.date_validite && d.date_validite >= today && d.date_validite <= inSevenDays,
  );
  const depasses = devisAttente.filter(
    (d) => d.date_validite && d.date_validite < today,
  );

  const facturesASuivre = [...impayees]
    .sort(
      (a, b) =>
        (a.statut_paiement === "en_retard" ? 0 : 1) -
          (b.statut_paiement === "en_retard" ? 0 : 1) ||
        a.date_echeance.localeCompare(b.date_echeance),
    )
    .slice(0, 8);
  const devisRecents = [...devis]
    .sort((a, b) => b.date_emission.localeCompare(a.date_emission))
    .slice(0, 8);

  const panel = "fade-up rounded-xl border border-line bg-surface p-5";
  const headLink = "text-sm font-medium text-muted hover:text-brand";
  const addLink =
    "rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-brand";
  const row =
    "-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-foreground/5";

  return (
    <>
      {(enRetard.length > 0 || expirantBientot.length > 0 || depasses.length > 0) && (
        <div className="mb-6 grid gap-3">
          {enRetard.length > 0 && (
            <p
              style={delay(0)}
              className="fade-up rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400"
            >
              {enRetard.length} facture{enRetard.length > 1 ? "s" : ""} en retard de
              paiement, soit {formatMontant(resteRetard)} à relancer.{" "}
              <Link href="/relances" className="font-semibold underline">
                Préparer les relances
              </Link>
            </p>
          )}
          {depasses.length > 0 && (
            <p
              style={delay(1)}
              className="fade-up rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
            >
              {depasses.length} devis dont la date de validité est dépassée : mettez
              leur statut à jour.
            </p>
          )}
          {expirantBientot.length > 0 && (
            <p
              style={delay(2)}
              className="fade-up rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
            >
              {expirantBientot.length} devis expire
              {expirantBientot.length > 1 ? "nt" : ""} dans les 7 prochains jours.
            </p>
          )}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs">
        <Kpi
          rank={0}
          label="Facturé ce mois (TTC)"
          value={<CountUp value={current.facture} />}
          accent="border-l-brand"
        />
        <Kpi
          rank={1}
          label="Encaissé ce mois (TTC)"
          value={<CountUp value={current.encaisse} />}
          accent="border-l-green-600"
        />
        <Kpi
          rank={2}
          label="Reste à encaisser"
          value={<CountUp value={resteTotal} />}
          hint={
            enRetard.length > 0
              ? `dont ${formatMontant(resteRetard)} en retard`
              : "Aucun retard"
          }
          accent="border-l-red-500"
        />
        <Kpi
          rank={3}
          label="Devis en attente"
          value={<CountUp value={devisAttente.length} kind="int" />}
          hint={formatMontant(totalAttente)}
          accent="border-l-amber-500"
        />
      </section>

      <section
        style={delay(4)}
        className={`${panel} mt-6`}
        aria-label="Chiffre d'affaires mensuel"
      >
        <h2 className="mb-3 font-display text-lg font-semibold">
          Chiffre d&apos;affaires des 12 derniers mois (TTC)
        </h2>
        <MonthlyChart data={months} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section style={delay(5)} className={panel} aria-label="Devis">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Devis récents</h2>
            <span className="flex items-center gap-4">
              <Link href="/devis" className={headLink}>
                Voir tout
              </Link>
              <Link href="/devis/new" className={addLink}>
                Ajouter un devis
              </Link>
            </span>
          </div>
          {devisRecents.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Aucun devis enregistré.</p>
          ) : (
            <ul className="mt-3">
              {devisRecents.map((d) => (
                <li key={d.id}>
                  <Link href={`/devis/${d.id}`} className={row}>
                    <div className="min-w-0">
                      <p className="font-medium">{d.numero}</p>
                      <p className="truncate text-muted">
                        {chantierLabel.get(d.chantier_id) ?? "Chantier inconnu"}
                      </p>
                      <p className="text-xs text-muted">
                        Émis le {formatDate(d.date_emission)}
                        {d.date_validite ? ` | valable jusqu'au ${formatDate(d.date_validite)}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium">{formatMontant(d.montant_ttc)}</p>
                      <Pill className={DEVIS_PILL[d.statut] ?? DEVIS_PILL.expire}>
                        {labelOf(DEVIS_STATUTS, d.statut)}
                      </Pill>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={delay(6)} className={panel} aria-label="Factures">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Factures à suivre</h2>
            <span className="flex items-center gap-4">
              <Link href="/factures" className={headLink}>
                Voir tout
              </Link>
              <Link href="/factures/new" className={addLink}>
                Ajouter une facture
              </Link>
            </span>
          </div>
          {facturesASuivre.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Aucune facture en attente de paiement.
            </p>
          ) : (
            <ul className="mt-3">
              {facturesASuivre.map((f) => {
                const statut = PAIEMENT_STATUTS[f.statut_paiement];
                return (
                  <li key={f.id}>
                    <Link href={`/factures/${f.id}`} className={row}>
                      <div className="min-w-0">
                        <p className="font-medium">{f.numero}</p>
                        <p className="truncate text-muted">
                          {chantierLabel.get(f.chantier_id) ?? "Chantier inconnu"}
                        </p>
                        <p className="text-xs text-muted">
                          Échéance le {formatDate(f.date_echeance)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium">{formatMontant(f.reste_a_payer)}</p>
                        <p className="text-xs text-muted">
                          sur {formatMontant(f.montant_ttc)}
                        </p>
                        <Pill className={statut.className}>{statut.label}</Pill>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
