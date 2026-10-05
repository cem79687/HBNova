"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readClientForm(formData: FormData) {
  const nom = text(formData, "nom");
  if (!nom) return null;
  return {
    type: text(formData, "type") === "professionnel" ? "professionnel" : "particulier",
    nom,
    telephone: text(formData, "telephone"),
    email: text(formData, "email"),
    adresse_facturation: text(formData, "adresse_facturation"),
    adresse_chantier: text(formData, "adresse_chantier"),
    notes: text(formData, "notes"),
  };
}

export async function createClientAction(formData: FormData) {
  const data = readClientForm(formData);
  if (!data) redirect("/clients/new?erreur=1");

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("clients")
    .insert(data)
    .select("id")
    .single();
  if (error || !created) redirect("/clients/new?erreur=2");

  revalidatePath("/clients");
  redirect(`/clients/${created.id}`);
}

export async function updateClientAction(id: string, formData: FormData) {
  const data = readClientForm(formData);
  if (!data) redirect(`/clients/${id}?erreur=1`);

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(data).eq("id", id);
  if (error) redirect(`/clients/${id}?erreur=2`);

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}?ok=1`);
}

export async function archiveClientAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`/clients/${id}?erreur=2`);

  revalidatePath("/clients");
  redirect("/clients");
}

export async function addContactAction(clientId: string, formData: FormData) {
  const nom = text(formData, "nom");
  if (!nom) return;

  const supabase = await createClient();
  await supabase.from("contacts").insert({
    client_id: clientId,
    nom,
    fonction: text(formData, "fonction"),
    telephone: text(formData, "telephone"),
    email: text(formData, "email"),
  });

  revalidatePath(`/clients/${clientId}`);
}

export async function deleteContactAction(clientId: string, contactId: string) {
  const supabase = await createClient();
  await supabase.from("contacts").delete().eq("id", contactId);

  revalidatePath(`/clients/${clientId}`);
}
