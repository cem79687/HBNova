"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import GlassShell from "@/components/glass-shell";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("E-mail ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    // Le proxy dirige ensuite vers le code de double authentification.
    router.replace("/");
    router.refresh();
  }

  return (
    <GlassShell title="Connexion" subtitle="Accès réservé à HBNova Bâti.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="glass-label">
            Adresse e-mail
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
        <div>
          <label htmlFor="password" className="glass-label">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input"
          />
        </div>

        {error && (
          <p role="alert" className="glass-error text-sm">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="glass-btn">
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>
      </form>

      <Link href="/forgot-password" className="glass-link">
        Mot de passe oublié ?
      </Link>
    </GlassShell>
  );
}
