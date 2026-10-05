"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import GlassShell from "@/components/glass-shell";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 12;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Choisissez au moins ${MIN_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(
        "Le mot de passe n'a pas pu être modifié. Le lien a peut-être expiré : redemandez-en un depuis la page de connexion.",
      );
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <GlassShell
      title="Nouveau mot de passe"
      subtitle={`Au moins ${MIN_LENGTH} caractères. Une phrase de passe longue est plus sûre qu'un mot court compliqué.`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="glass-label">
            Nouveau mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="glass-label">
            Confirmer le mot de passe
          </label>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="glass-input"
          />
        </div>

        {error && (
          <p role="alert" className="glass-error text-sm">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="glass-btn">
          {loading ? "Enregistrement..." : "Enregistrer le mot de passe"}
        </button>
      </form>
    </GlassShell>
  );
}
