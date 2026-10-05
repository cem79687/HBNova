import { STATUTS, type Chantier } from "@/lib/chantiers";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  clients: { id: string; nom: string }[];
  chantier?: Partial<Chantier>;
  defaultClientId?: string;
  submitLabel: string;
  error?: string;
  notice?: string;
};

const field =
  "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const label = "text-sm font-medium";

export default function ChantierForm({
  action,
  clients,
  chantier,
  defaultClientId,
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
          <label htmlFor="intitule" className={label}>
            Intitulé du chantier
          </label>
          <input
            id="intitule"
            name="intitule"
            required
            defaultValue={chantier?.intitule ?? ""}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="client_id" className={label}>
            Client
          </label>
          <select
            id="client_id"
            name="client_id"
            required
            defaultValue={chantier?.client_id ?? defaultClientId ?? ""}
            className={field}
          >
            <option value="" disabled>
              Choisir un client
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="statut" className={label}>
            Statut
          </label>
          <select
            id="statut"
            name="statut"
            defaultValue={chantier?.statut ?? "nouveau_contact"}
            className={field}
          >
            {STATUTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="budget_estime" className={label}>
            Budget estimé (en euros)
          </label>
          <input
            id="budget_estime"
            name="budget_estime"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={chantier?.budget_estime ?? ""}
            className={field}
          />
        </div>
        <div />
        <div>
          <label htmlFor="date_debut" className={label}>
            Date de début
          </label>
          <input
            id="date_debut"
            name="date_debut"
            type="date"
            defaultValue={chantier?.date_debut ?? ""}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="date_fin" className={label}>
            Date de fin prévue
          </label>
          <input
            id="date_fin"
            name="date_fin"
            type="date"
            defaultValue={chantier?.date_fin ?? ""}
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="adresse" className={label}>
          Adresse du chantier
        </label>
        <textarea
          id="adresse"
          name="adresse"
          rows={2}
          defaultValue={chantier?.adresse ?? ""}
          className={field}
        />
        <p className="mt-1 text-xs text-muted">
          Si vous la laissez vide à la création, l&apos;adresse de chantier du
          client est reprise.
        </p>
      </div>
      <div>
        <label htmlFor="notes" className={label}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={chantier?.notes ?? ""}
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
