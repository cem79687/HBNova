"use client";

import { useTransition } from "react";
import { STATUTS } from "@/lib/chantiers";

type Props = {
  id: string;
  statut: string;
  action: (id: string, statut: string) => Promise<void>;
};

export default function StatusSelect({ id, statut, action }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Changer le statut"
      value={statut}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value;
        startTransition(() => action(id, next));
      }}
      className="w-full rounded-md border border-line bg-background px-2 py-1.5 text-xs outline-none focus:border-brand disabled:opacity-60"
    >
      {STATUTS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
