import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cette route reçoit le lien de récupération du mot de passe envoyé par e-mail.
// Elle ne sert qu'à cela : la destination est donc fixe.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect("/reset-password");
  }

  redirect("/forgot-password?erreur=lien");
}
