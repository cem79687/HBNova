"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  kind?: "euro" | "int";
  duration?: number;
};

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function format(value: number, kind: "euro" | "int"): string {
  return kind === "euro" ? euro.format(value) : integer.format(Math.round(value));
}

// Affiche un nombre qui monte jusqu'à sa valeur. Les lecteurs d'écran
// reçoivent directement la valeur finale, et l'animation est coupée pour
// les personnes qui ont réduit les animations sur leur appareil.
export default function CountUp({ value, kind = "euro", duration = 900 }: Props) {
  const [display, setDisplay] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = shown.current;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = reduce ? 1 : Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const current = start + (value - start) * eased;
      shown.current = current;
      setDisplay(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <>
      <span aria-hidden="true">{format(display, kind)}</span>
      <span className="sr-only">{format(value, kind)}</span>
    </>
  );
}
