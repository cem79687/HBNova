"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEVIS_STATUTS, FACTURE_TYPES, PAIEMENT_MODES } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function nombre(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function oneOf<T extends string>(
  list: readonly { value: T }[],
  value: string | null,
  fallback: T,
): T {
  const found = list.find((item) => item.value === value);
  return found ? found.value : fallback;
}

type Fail = { ok: false; erreur: "1" | "3" | "4" };

type Common = {
  chantier_id: string;
  numero: string;
  date_emission: string;
  montant_ht: number;
  montant_ttc: number;
  notes: string | null;
};

function readCommon(
  formData: FormData,
): { ok: true; data: Common } | Fail {
  const numero = text(formData, "numero");
  const chantierId = text(formData, "chantier_id");
  const dateEmission = text(formData, "date_emission");
  const ht = nombre(text(formData, "montant_ht"));
  const ttc = nombre(text(formData, "montant_ttc"));

  if (!numero || !chantierId || !dateEmission || ht === null || ttc === null) {
    return { ok: false, erreur: "1" };
  }
  if (ht < 0 || ttc < ht) return { ok: false, erreur: "4" };

  return {
    ok: true,
    data: {
      chantier_id: chantierId,
      numero,
      date_emission: dateEmission,
      montant_ht: ht,
      montant_ttc: ttc,
      notes: text(formData, "notes"),
    },
  };
}

function readDevis(formData: FormData) {
  const common = readCommon(formData);
  if (!common.ok) return common;
  const validite = text(formData, "date_validite");
  if (validite && validite < common.data.date_emission) {
    return { ok: false, erreur: "3" } as Fail;
  }
  return {
    ok: true as const,
    data: {
      ...common.data,
      date_validite: validite,
      statut: oneOf(DEVIS_STATUTS, text(formData, "statut"), "envoye"),
    },
  };
}

function readFacture(formData: FormData) {
  const common = readCommon(formData);
  if (!common.ok) return common;
  const echeance = text(formData, "date_echeance");
  if (!echeance) return { ok: false, erreur: "1" } as Fail;
  if (echeance < common.data.date_emission) {
    return { ok: false, erreur: "3" } as Fail;
  }
  return {
    ok: true as const,
    data: {
      ...common.data,
      date_echeance: echeance,
      type: oneOf(FACTURE_TYPES, text(formData, "type"), "acompte"),
    },
  };
}

// ---------- Devis ----------

export async function createDevisAction(formData: FormData) {
  const chantierParam = text(formData, "chantier_id") ?? "";
  const parsed = readDevis(formData);
  if (!parsed.ok) {
    redirect(`/devis/new?chantier=${chantierParam}&erreur=${parsed.erreur}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("devis").insert(parsed.data);
  if (error) {
    const code = error.code === "23505" ? "5" : "2";
    redirect(`/devis/new?chantier=${chantierParam}&erreur=${code}`);
  }

  revalidatePath(`/chantiers/${parsed.data.chantier_id}`);
  redirect(`/chantiers/${parsed.data.chantier_id}`);
}

export async function updateDevisAction(id: string, formData: FormData) {
  const parsed = readDevis(formData);
  if (!parsed.ok) redirect(`/devis/${id}?erreur=${parsed.erreur}`);

  const supabase = await createClient();
  const { error } = await supabase.from("devis").update(parsed.data).eq("id", id);
  if (error) {
    redirect(`/devis/${id}?erreur=${error.code === "23505" ? "5" : "2"}`);
  }

  revalidatePath(`/chantiers/${parsed.data.chantier_id}`);
  redirect(`/devis/${id}?ok=1`);
}

export async function archiveDevisAction(id: string, chantierId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("devis")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`/devis/${id}?erreur=2`);

  revalidatePath(`/chantiers/${chantierId}`);
  redirect(`/chantiers/${chantierId}`);
}

// ---------- Factures ----------

export async function createFactureAction(formData: FormData) {
  const chantierParam = text(formData, "chantier_id") ?? "";
  const parsed = readFacture(formData);
  if (!parsed.ok) {
    redirect(`/factures/new?chantier=${chantierParam}&erreur=${parsed.erreur}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("factures")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error || !data) {
    const code = error?.code === "23505" ? "5" : "2";
    redirect(`/factures/new?chantier=${chantierParam}&erreur=${code}`);
  }

  revalidatePath(`/chantiers/${parsed.data.chantier_id}`);
  redirect(`/factures/${data.id}`);
}

export async function updateFactureAction(id: string, formData: FormData) {
  const parsed = readFacture(formData);
  if (!parsed.ok) redirect(`/factures/${id}?erreur=${parsed.erreur}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("factures")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    redirect(`/factures/${id}?erreur=${error.code === "23505" ? "5" : "2"}`);
  }

  revalidatePath(`/chantiers/${parsed.data.chantier_id}`);
  redirect(`/factures/${id}?ok=1`);
}

export async function archiveFactureAction(id: string, chantierId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("factures")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`/factures/${id}?erreur=2`);

  revalidatePath(`/chantiers/${chantierId}`);
  redirect(`/chantiers/${chantierId}`);
}

// ---------- Paiements ----------

export async function addPaiementAction(factureId: string, formData: FormData) {
  const montant = nombre(text(formData, "montant"));
  const date = text(formData, "date_paiement");
  if (montant === null || montant <= 0 || !date) {
    redirect(`/factures/${factureId}?erreur=6`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("paiements").insert({
    facture_id: factureId,
    date_paiement: date,
    montant,
    mode: oneOf(PAIEMENT_MODES, text(formData, "mode"), "virement"),
  });
  if (error) redirect(`/factures/${factureId}?erreur=2`);

  revalidatePath(`/factures/${factureId}`);
  redirect(`/factures/${factureId}?ok=2`);
}

export async function deletePaiementAction(
  factureId: string,
  paiementId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("paiements")
    .delete()
    .eq("id", paiementId);
  if (error) redirect(`/factures/${factureId}?erreur=2`);

  revalidatePath(`/factures/${factureId}`);
  redirect(`/factures/${factureId}?ok=3`);
}
