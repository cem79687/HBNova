export const DEVIS_STATUTS = [
  { value: "envoye", label: "Envoyé" },
  { value: "accepte", label: "Accepté" },
  { value: "refuse", label: "Refusé" },
  { value: "expire", label: "Expiré" },
] as const;

export const FACTURE_TYPES = [
  { value: "acompte", label: "Acompte" },
  { value: "situation", label: "Situation" },
  { value: "solde", label: "Solde" },
] as const;

export const PAIEMENT_MODES = [
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "especes", label: "Espèces" },
  { value: "carte", label: "Carte bancaire" },
  { value: "autre", label: "Autre" },
] as const;

export type StatutPaiement = "a_payer" | "partielle" | "payee" | "en_retard";

export const PAIEMENT_STATUTS: Record<
  StatutPaiement,
  { label: string; className: string }
> = {
  a_payer: { label: "À payer", className: "bg-background text-muted" },
  partielle: {
    label: "Partiellement payée",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  payee: {
    label: "Payée",
    className: "bg-green-500/15 text-green-700 dark:text-green-400",
  },
  en_retard: {
    label: "En retard",
    className: "bg-red-500/15 text-red-700 dark:text-red-400",
  },
};

export type Devis = {
  id: string;
  chantier_id: string;
  numero: string;
  statut: string;
  date_emission: string;
  date_validite: string | null;
  montant_ht: number;
  montant_ttc: number;
  montant_tva: number;
  pdf_path: string | null;
  notes: string | null;
};

export type FactureSuivi = {
  id: string;
  chantier_id: string;
  numero: string;
  type: string;
  date_emission: string;
  date_echeance: string;
  montant_ht: number;
  montant_ttc: number;
  montant_tva: number;
  pdf_path: string | null;
  notes: string | null;
  montant_paye: number;
  reste_a_payer: number;
  statut_paiement: StatutPaiement;
};

export type Paiement = {
  id: string;
  facture_id: string;
  date_paiement: string;
  montant: number;
  mode: string;
};

export function labelOf(
  list: readonly { value: string; label: string }[],
  value: string,
): string {
  return list.find((item) => item.value === value)?.label ?? value;
}

// Montant avec centimes, par exemple 1 234,50 €
export function formatMontant(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value));
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function documentErrorMessage(code?: string): string | undefined {
  switch (code) {
    case undefined:
    case "":
      return undefined;
    case "1":
      return "Le numéro, le chantier, la date et les montants sont obligatoires.";
    case "3":
      return "Les dates sont incohérentes : la date de fin ne peut pas précéder la date d'émission.";
    case "4":
      return "Les montants doivent être positifs, avec un TTC supérieur ou égal au HT.";
    case "5":
      return "Ce numéro existe déjà (même s'il est archivé).";
    case "6":
      return "Indiquez une date et un montant supérieur à zéro.";
    default:
      return "L'enregistrement a échoué. Réessayez.";
  }
}
