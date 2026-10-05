"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    setLoading(false);
    if (error?.status === 429) {
      setError("Trop de demandes. Réessayez dans quelques minutes.");
      return;
    }
    // Même message dans tous les autres cas : on ne révèle pas si l'adresse existe.
    setSent(true);
  }

  if (sent) {
    return (
      <p role="status" className="glass-ok text-sm">
        Si cette adresse correspond à un compte, un e-mail vient d&apos;être
        envoyé. Ouvrez le lien qu&apos;il contient avec ce même navigateur pour
        choisir un nouveau mot de passe.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="glass-label">
          Adresse e-mail du compte
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="glass-input"
        />
      </div>

      {error && (
        <p role="alert" className="glass-error text-sm">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="glass-btn">
        {loading ? "Envoi en cours..." : "Envoyer le lien"}
      </button>
    </form>
  );
}
