import {
  FACTURE_TYPES,
  todayISO,
  type FactureSuivi,
} from "@/lib/documents";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  chantiers: { id: string; label: string }[];
  facture?: Partial<FactureSuivi>;
  defaultChantierId?: string;
  submitLabel: string;
  error?: string;
  notice?: string;
};

const field =
  "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const label = "text-sm font-medium";

export default function FactureForm({
  action,
  chantiers,
  facture,
  defaultChantierId,
  submitLabel,
  error,
  notice,
}: Props) {
  return (
    <form
      action={action}
      className="max-w-3xl space-y-5 rounded-xl border border-line bg-surface p-6"
    >
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400"
        >
          {notice}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="chantier_id" className={label}>
            Chantier
          </label>
          <select
            id="chantier_id"
            name="chantier_id"
            required
            defaultValue={facture?.chantier_id ?? defaultChantierId ?? ""}
            className={field}
          >
            <option value="" disabled>
              Choisir un chantier
            </option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="numero" className={label}>
            Numéro de la facture
          </label>
          <input
            id="numero"
            name="numero"
            required
            placeholder="FAC-2026-001"
            defaultValue={facture?.numero ?? ""}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="type" className={label}>
            Type de facture
          </label>
          <select
            id="type"
            name="type"
            defaultValue={facture?.type ?? "acompte"}
            className={field}
          >
            {FACTURE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="date_emission" className={label}>
            Date d&apos;émission
          </label>
          <input
            id="date_emission"
            name="date_emission"
            type="date"
            required
            defaultValue={facture?.date_emission ?? todayISO()}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="date_echeance" className={label}>
            Date d&apos;échéance
          </label>
          <input
            id="date_echeance"
            name="date_echeance"
            type="date"
            required
            defaultValue={facture?.date_echeance ?? ""}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="montant_ht" className={label}>
            Montant HT (en euros)
          </label>
          <input
            id="montant_ht"
            name="montant_ht"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required
            defaultValue={facture?.montant_ht ?? ""}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="montant_ttc" className={label}>
            Montant TTC (en euros)
          </label>
          <input
            id="montant_ttc"
            name="montant_ttc"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required
            defaultValue={facture?.montant_ttc ?? ""}
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={label}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={facture?.notes ?? ""}
          className={field}
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white dark:text-black"
      >
        {submitLabel}
      </button>
    </form>
  );
}
