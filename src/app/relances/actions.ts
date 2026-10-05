"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CANAUX } from "@/lib/relances";
import { createClient } from "@/lib/supabase/server";

export async function logRelanceAction(factureId: string, formData: FormData) {
  const niveau = Number(formData.get("niveau"));
  const canalBrut = formData.get("canal");
  const canal = typeof canalBrut === "string" ? canalBrut : "";

  if (![1, 2, 3].includes(niveau) || !CANAUX.some((c) => c.value === canal)) {
    redirect(`/relances/${factureId}?erreur=1`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("relances")
    .insert({ facture_id: factureId, niveau, canal });
  if (error) redirect(`/relances/${factureId}?erreur=2`);

  revalidatePath("/relances");
  redirect(`/relances/${factureId}?ok=1`);
}

export async function deleteRelanceAction(factureId: string, relanceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("relances").delete().eq("id", relanceId);
  if (error) redirect(`/relances/${factureId}?erreur=2`);

  revalidatePath("/relances");
  redirect(`/relances/${factureId}?ok=2`);
}
