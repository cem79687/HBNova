import { formatMontant } from "@/lib/documents";

// Nom utilisé dans la signature des messages.
export const ENTREPRISE = "HBNova Bâti";

export const NIVEAUX = [
  { value: 1, label: "Rappel amical" },
  { value: 2, label: "Relance ferme" },
  { value: 3, label: "Mise en demeure" },
] as const;

export const CANAUX = [
  { value: "email", label: "E-mail" },
  { value: "sms", label: "SMS" },
  { value: "courrier", label: "Courrier recommandé" },
  { value: "telephone", label: "Téléphone" },
] as const;

export type Niveau = 1 | 2 | 3;

export type Relance = {
  id: string;
  facture_id: string;
  niveau: number;
  canal: string;
  envoyee_le: string;
};

export function niveauLabel(niveau: number): string {
  return NIVEAUX.find((n) => n.value === niveau)?.label ?? `Niveau ${niveau}`;
}

export function parisDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

// Nombre de jours entre deux dates au format AAAA-MM-JJ
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export function suggestedLevel(
  joursRetard: number,
  dernierNiveau: number | null,
  joursDepuisDerniere: number | null,
): Niveau {
  const base = joursRetard >= 45 ? 3 : joursRetard >= 15 ? 2 : 1;
  if (!dernierNiveau) return base;
  // Une relance toute récente ne justifie pas de monter tout de suite d'un niveau.
  const next =
    joursDepuisDerniere !== null && joursDepuisDerniere < 10
      ? dernierNiveau
      : Math.min(3, dernierNiveau + 1);
  return Math.max(base, next) as Niveau;
}

export type MessageVars = {
  clientType: "particulier" | "professionnel";
  numero: string;
  reste: number;
  echeance: string; // déjà formaté, par exemple 31/10/2026
  joursRetard: number;
};

function clean(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, " ");
}

export function buildMessages(
  niveau: Niveau,
  v: MessageVars,
): { subject: string; email: string; sms: string } {
  const montant = clean(formatMontant(v.reste));
  const signature = `Cordialement,\n${ENTREPRISE}`;

  if (niveau === 1) {
    return {
      subject: `Rappel : facture ${v.numero}`,
      email: `Bonjour,

Sauf erreur de notre part, la facture ${v.numero}, d'un montant restant de ${montant} TTC et arrivée à échéance le ${v.echeance}, n'a pas encore été réglée.

Si votre règlement a été effectué entre-temps, merci de ne pas tenir compte de ce message. Dans le cas contraire, nous vous remercions de bien vouloir procéder au paiement dans les meilleurs délais.

Nous restons à votre disposition pour toute question.

${signature}`,
      sms: `Bonjour, sauf erreur de notre part, la facture ${v.numero} (${montant}) échue le ${v.echeance} reste à régler. Merci de votre règlement. ${ENTREPRISE}`,
    };
  }

  if (niveau === 2) {
    return {
      subject: `Relance : facture ${v.numero} impayée`,
      email: `Bonjour,

À ce jour, la facture ${v.numero}, d'un montant restant de ${montant} TTC et échue depuis le ${v.echeance} (${v.joursRetard} jours de retard), reste impayée.

Nous vous demandons de bien vouloir régler cette somme sous 8 jours. Passé ce délai, nous serons contraints d'engager des démarches de recouvrement.

Si vous rencontrez une difficulté, contactez-nous rapidement afin que nous trouvions une solution.

${signature}`,
      sms: `Bonjour, la facture ${v.numero} (${montant}) est impayée depuis le ${v.echeance}. Merci de régler sous 8 jours, à défaut des démarches de recouvrement seront engagées. ${ENTREPRISE}`,
    };
  }

  const clauseProfessionnel =
    v.clientType === "professionnel"
      ? `Conformément aux articles L441-10 et D441-5 du Code de commerce, des pénalités de retard sont exigibles de plein droit, ainsi qu'une indemnité forfaitaire de 40 euros pour frais de recouvrement.\n\n`
      : "";

  return {
    subject: `Mise en demeure de payer : facture ${v.numero}`,
    email: `Objet : mise en demeure de payer la facture ${v.numero}

Madame, Monsieur,

La facture ${v.numero}, d'un montant restant de ${montant} TTC, est échue depuis le ${v.echeance}. Malgré nos relances, elle reste impayée.

Par la présente, nous vous mettons en demeure de nous régler la somme de ${montant} dans un délai de 8 jours à compter de la réception de ce courrier.

${clauseProfessionnel}À défaut de règlement dans ce délai, nous nous réservons le droit d'engager toute procédure de recouvrement, sans nouvel avis.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

${ENTREPRISE}`,
    sms: "",
  };
}

export function relanceMessage(code?: string, ok?: string): {
  error?: string;
  notice?: string;
} {
  const notices: Record<string, string> = {
    "1": "Relance enregistrée dans le journal.",
    "2": "Entrée supprimée du journal.",
  };
  const errors: Record<string, string> = {
    "1": "Niveau ou canal invalide.",
  };
  return {
    notice: ok ? notices[ok] : undefined,
    error: code ? (errors[code] ?? "L'enregistrement a échoué. Réessayez.") : undefined,
  };
}
