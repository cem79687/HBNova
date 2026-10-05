import type { CSSProperties } from "react";

export type MonthPoint = {
  key: string;
  label: string;
  facture: number;
  encaisse: number;
};

const W = 720;
const H = 260;
const LEFT = 52;
const RIGHT = 12;
const TOP = 14;
const BOTTOM = 30;

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(raw));
  const f = raw / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const maxValue = Math.max(0, ...data.flatMap((d) => [d.facture, d.encaisse]));

  if (maxValue === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        Pas encore de facture ni de paiement sur les 12 derniers mois.
      </p>
    );
  }

  const step = niceStep(maxValue / 4);
  const top = step * 4;
  const plotH = H - TOP - BOTTOM;
  const plotW = W - LEFT - RIGHT;
  const group = plotW / data.length;
  const barW = Math.min(18, group / 3);
  const pairW = barW * 2 + 4;

  const totalFacture = data.reduce((s, d) => s + d.facture, 0);
  const totalEncaisse = data.reduce((s, d) => s + d.encaisse, 0);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Chiffre d'affaires TTC sur 12 mois : ${euro.format(totalFacture)} facturés et ${euro.format(totalEncaisse)} encaissés`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const value = step * i;
          const y = TOP + plotH - (value / top) * plotH;
          return (
            <g key={i}>
              <line
                x1={LEFT}
                x2={W - RIGHT}
                y1={y}
                y2={y}
                className="stroke-line"
                strokeWidth={1}
              />
              <text
                x={LEFT - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted text-[11px]"
              >
                {value === 0 ? "0" : `${compact.format(value)} €`}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x0 = LEFT + i * group + (group - pairW) / 2;
          const hF = (d.facture / top) * plotH;
          const hE = (d.encaisse / top) * plotH;
          const delay = { "--i": i } as CSSProperties;
          return (
            <g key={d.key}>
              <rect
                x={x0}
                y={TOP + plotH - hF}
                width={barW}
                height={hF}
                rx={2}
                style={delay}
                className="bar-grow fill-foreground/30"
              >
                <title>{`${d.label} : ${euro.format(d.facture)} facturés`}</title>
              </rect>
              <rect
                x={x0 + barW + 4}
                y={TOP + plotH - hE}
                width={barW}
                height={hE}
                rx={2}
                style={delay}
                className="bar-grow fill-brand"
              >
                <title>{`${d.label} : ${euro.format(d.encaisse)} encaissés`}</title>
              </rect>
              <text
                x={x0 + pairW / 2}
                y={H - 10}
                textAnchor="middle"
                className="fill-muted text-[11px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-2">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-foreground/30" />
          Facturé : {euro.format(totalFacture)}
        </span>
        <span className="flex items-center gap-2">
          <i className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" />
          Encaissé : {euro.format(totalEncaisse)}
        </span>
      </div>
    </div>
  );
}
