"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isStatut } from "@/lib/chantiers";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

type Parsed =
  | {
      ok: true;
      data: {
        client_id: string;
        intitule: string;
        statut: string;
        budget_estime: number | null;
        adresse: string | null;
        date_debut: string | null;
        date_fin: string | null;
        notes: string | null;
      };
    }
  | { ok: false; erreur: "1" | "3" | "4" };

function readChantierForm(formData: FormData): Parsed {
  const intitule = text(formData, "intitule");
  const clientId = text(formData, "client_id");
  if (!intitule || !clientId) return { ok: false, erreur: "1" };

  const rawBudget = text(formData, "budget_estime");
  let budget: number | null = null;
  if (rawBudget !== null) {
    budget = Number(rawBudget.replace(",", "."));
    if (!Number.isFinite(budget) || budget < 0) return { ok: false, erreur: "4" };
  }

  const dateDebut = text(formData, "date_debut");
  const dateFin = text(formData, "date_fin");
  if (dateDebut && dateFin && dateFin < dateDebut) {
    return { ok: false, erreur: "3" };
  }

  const statutBrut = text(formData, "statut");
  return {
    ok: true,
    data: {
      client_id: clientId,
      intitule,
      statut: isStatut(statutBrut) ? statutBrut : "nouveau_contact",
      budget_estime: budget,
      adresse: text(formData, "adresse"),
      date_debut: dateDebut,
      date_fin: dateFin,
      notes: text(formData, "notes"),
    },
  };
}

export async function createChantierAction(formData: FormData) {
  const parsed = readChantierForm(formData);
  if (!parsed.ok) redirect(`/chantiers/new?erreur=${parsed.erreur}`);

  const supabase = await createClient();
  let data = parsed.data;

  // Sans adresse saisie, on reprend l'adresse de chantier du client.
  if (!data.adresse) {
    const { data: client } = await supabase
      .from("clients")
      .select("adresse_chantier")
      .eq("id", data.client_id)
      .maybeSingle();
    const adresse = (client as { adresse_chantier: string | null } | null)
      ?.adresse_chantier;
    data = { ...data, adresse: adresse ?? null };
  }

  const { data: created, error } = await supabase
    .from("chantiers")
    .insert(data)
    .select("id")
    .single();
  if (error || !created) redirect("/chantiers/new?erreur=2");

  revalidatePath("/chantiers");
  redirect(`/chantiers/${created.id}`);
}

export async function updateChantierAction(id: string, formData: FormData) {
  const parsed = readChantierForm(formData);
  if (!parsed.ok) redirect(`/chantiers/${id}?erreur=${parsed.erreur}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("chantiers")
    .update(parsed.data)
    .eq("id", id);
  if (error) redirect(`/chantiers/${id}?erreur=2`);

  revalidatePath("/chantiers");
  revalidatePath(`/chantiers/${id}`);
  redirect(`/chantiers/${id}?ok=1`);
}

export async function moveChantierAction(id: string, statut: string) {
  if (!isStatut(statut)) return;

  const supabase = await createClient();
  await supabase.from("chantiers").update({ statut }).eq("id", id);

  revalidatePath("/chantiers");
  revalidatePath(`/chantiers/${id}`);
}

export async function archiveChantierAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chantiers")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`/chantiers/${id}?erreur=2`);

  revalidatePath("/chantiers");
  redirect("/chantiers");
}
