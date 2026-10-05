import Link from "next/link";
import AppShell from "@/components/app-shell";
import { formatDate } from "@/lib/chantiers";
import { formatMontant } from "@/lib/documents";
import {
  daysBetween,
  niveauLabel,
  parisDate,
  suggestedLevel,
  type Relance,
} from "@/lib/relances";
import { createClient } from "@/lib/supabase/server";

type FactureRow = {
  id: string;
  numero: string;
  chantier_id: string;
  date_echeance: string;
  montant_ttc: number;
  reste_a_payer: number;
};
type ChantierRow = {
  id: string;
  intitule: string;
  clients: { nom: string } | null;
};

export default async function RelancesPage() {
  const today = parisDate(new Date());

  const supabase = await createClient();
  const { data } = await supabase
    .from("factures_suivi")
    .select("id, numero, chantier_id, date_echeance, montant_ttc, reste_a_payer")
    .is("archived_at", null)
    .eq("statut_paiement", "en_retard")
    .order("date_echeance", { ascending: true });
  const factures = (data ?? []) as FactureRow[];

  const ids = factures.map((f) => f.id);
  const [relancesRes, chantiersRes] = await Promise.all([
    ids.length > 0
      ? supabase
          .from("relances")
          .select("id, facture_id, niveau, canal, envoyee_le")
          .in("facture_id", ids)
          .order("envoyee_le", { ascending: false })
      : Promise.resolve({ data: [] as Relance[] }),
    supabase.from("chantiers").select("id, intitule, clients(nom)"),
  ]);

  const relances = (relancesRes.data ?? []) as Relance[];
  const derniere = new Map<string, Relance>();
  for (const r of relances) {
    if (!derniere.has(r.facture_id)) derniere.set(r.facture_id, r);
  }

  const clients = new Map(
    ((chantiersRes.data ?? []) as unknown as ChantierRow[]).map((c) => [
      c.id,
      c.clients?.nom ?? "Client inconnu",
    ]),
  );

  const totalReste = factures.reduce((s, f) => s + Number(f.reste_a_payer), 0);

  return (
    <AppShell
      title="Relances"
      subtitle={
        factures.length === 0
          ? "Aucune facture en retard"
          : `${factures.length} facture${factures.length > 1 ? "s" : ""} en retard, ${formatMontant(totalReste)} à encaisser`
      }
    >
      {factures.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
          Aucun retard de paiement : il n&apos;y a rien à relancer.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Facture</th>
                <th className="px-4 py-3 text-right font-medium">Reste à payer</th>
                <th className="px-4 py-3 font-medium">Retard</th>
                <th className="px-4 py-3 font-medium">Dernière relance</th>
                <th className="px-4 py-3 font-medium">Niveau conseillé</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => {
                const jours = daysBetween(f.date_echeance, today);
                const last = derniere.get(f.id);
                const lastDate = last ? parisDate(new Date(last.envoyee_le)) : null;
                const conseille = suggestedLevel(
                  jours,
                  last ? last.niveau : null,
                  lastDate ? daysBetween(lastDate, today) : null,
                );
                return (
                  <tr key={f.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {clients.get(f.chantier_id) ?? "Client inconnu"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/factures/${f.id}`} className="hover:text-brand">
                        {f.numero}
                      </Link>
                      <p className="text-xs text-muted">
                        échue le {formatDate(f.date_echeance)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMontant(f.reste_a_payer)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                        {jours} jour{jours > 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {last && lastDate ? (
                        <>
                          {niveauLabel(last.niveau)}
                          <p className="text-xs text-muted">le {formatDate(lastDate)}</p>
                        </>
                      ) : (
                        <span className="text-muted">Aucune</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{niveauLabel(conseille)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/relances/${f.id}`}
                        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white dark:text-black"
                      >
                        Préparer
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm text-muted">
        L&apos;application prépare les messages : vous les envoyez vous-même,
        puis vous enregistrez l&apos;envoi dans le journal.
      </p>
    </AppShell>
  );
}
