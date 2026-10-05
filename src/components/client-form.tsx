import type { Client } from "@/lib/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  client?: Partial<Client>;
  submitLabel: string;
  error?: string;
  notice?: string;
};

const field =
  "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const label = "text-sm font-medium";

export default function ClientForm({
  action,
  client,
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
        <div>
          <label htmlFor="type" className={label}>
            Type de client
          </label>
          <select
            id="type"
            name="type"
            defaultValue={client?.type ?? "particulier"}
            className={field}
          >
            <option value="particulier">Particulier</option>
            <option value="professionnel">Professionnel</option>
          </select>
        </div>
        <div>
          <label htmlFor="nom" className={label}>
            Nom ou raison sociale
          </label>
          <input
            id="nom"
            name="nom"
            required
            defaultValue={client?.nom ?? ""}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="telephone" className={label}>
            Téléphone
          </label>
          <input
            id="telephone"
            name="telephone"
            type="tel"
            defaultValue={client?.telephone ?? ""}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Adresse e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="adresse_facturation" className={label}>
          Adresse de facturation
        </label>
        <textarea
          id="adresse_facturation"
          name="adresse_facturation"
          rows={2}
          defaultValue={client?.adresse_facturation ?? ""}
          className={field}
        />
      </div>
      <div>
        <label htmlFor="adresse_chantier" className={label}>
          Adresse du chantier
        </label>
        <textarea
          id="adresse_chantier"
          name="adresse_chantier"
          rows={2}
          defaultValue={client?.adresse_chantier ?? ""}
          className={field}
        />
      </div>
      <div>
        <label htmlFor="notes" className={label}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ""}
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
