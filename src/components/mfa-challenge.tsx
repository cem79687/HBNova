"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LENGTH = 6;
const EMPTY = Array.from({ length: LENGTH }, () => "");

export default function MfaChallenge({ next }: { next: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  async function verify(code: string) {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const factors = data?.totp ?? [];

    // Plusieurs appareils peuvent être enregistrés : on essaie chacun.
    let verified = false;
    for (const factor of factors) {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code,
      });
      if (!verifyError) {
        verified = true;
        break;
      }
    }

    if (!verified) {
      setError("Code incorrect ou expiré. Attendez le prochain code et réessayez.");
      setDigits(EMPTY);
      setLoading(false);
      refs.current[0]?.focus();
      return;
    }

    router.replace(next);
    router.refresh();
  }

  function update(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);

    if (digit && index < LENGTH - 1) refs.current[index + 1]?.focus();
    if (updated.every(Boolean)) void verify(updated.join(""));
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, LENGTH);
    if (!pasted) return;
    event.preventDefault();

    setDigits(Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? ""));
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
    if (pasted.length === LENGTH) void verify(pasted);
  }

  const complete = digits.every(Boolean);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (complete && !loading) void verify(digits.join(""));
      }}
    >
      <div className="glass-code" role="group" aria-label="Code à 6 chiffres">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            autoFocus={i === 0}
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Chiffre ${i + 1}`}
            value={digit}
            disabled={loading}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            className="glass-input"
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="glass-error mt-4 text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !complete}
        className="glass-btn mt-5"
      >
        {loading ? "Vérification..." : "Valider"}
      </button>
    </form>
  );
}
