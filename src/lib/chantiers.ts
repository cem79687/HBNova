export const STATUTS = [
  { value: "nouveau_contact", label: "Nouveau contact" },
  { value: "devis_a_faire", label: "Devis à faire" },
  { value: "devis_envoye", label: "Devis envoyé" },
  { value: "en_chantier", label: "En chantier" },
  { value: "termine", label: "Terminé" },
  { value: "annule", label: "Annulé" },
] as const;

export type Statut = (typeof STATUTS)[number]["value"];

export function isStatut(value: unknown): value is Statut {
  return STATUTS.some((s) => s.value === value);
}

export function statutLabel(value: string | null): string {
  if (!value) return "Création";
  return STATUTS.find((s) => s.value === value)?.label ?? value;
}

export type Chantier = {
  id: string;
  client_id: string;
  intitule: string;
  statut: Statut;
  budget_estime: number | null;
  adresse: string | null;
  date_debut: string | null;
  date_fin: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChantierStatutLog = {
  id: string;
  ancien_statut: string | null;
  nouveau_statut: string;
  changed_at: string;
};

export function formatEuro(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

// Date au format AAAA-MM-JJ renvoyée par la base -> JJ/MM/AAAA
export function formatDate(value: string | null): string {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export function chantierErrorMessage(code?: string): string | undefined {
  switch (code) {
    case undefined:
    case "":
      return undefined;
    case "1":
      return "L'intitulé et le client sont obligatoires.";
    case "3":
      return "La date de fin ne peut pas précéder la date de début.";
    case "4":
      return "Le budget doit être un nombre positif.";
    default:
      return "L'enregistrement a échoué. Réessayez.";
  }
}
