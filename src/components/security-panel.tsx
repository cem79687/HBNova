"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Factor = {
  id: string;
  friendly_name?: string | null;
  created_at: string;
};

type Enrollment = { factorId: string; qr: string; secret: string };

const field =
  "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

export default function SecurityPanel() {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setError("Impossible de lire vos appareils. Rechargez la page.");
      return;
    }
    setFactors((data?.totp ?? []) as Factor[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();

    // Nettoie les essais précédents restés inachevés.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    const friendlyName = name.trim() || `Appareil ${(factors?.length ?? 0) + 1}`;
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
    });

    if (enrollError || !data) {
      setError(
        "L'ajout a échoué. Essayez avec un autre nom d'appareil, ou rechargez la page.",
      );
      setBusy(false);
      return;
    }

    setEnrollment({
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setBusy(false);
  }

  async function confirmEnroll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    });

    if (verifyError) {
      setError(
        "Code incorrect ou expiré. Vérifiez que l'heure de votre téléphone est automatique, puis réessayez avec le code suivant.",
      );
      setCode("");
      setBusy(false);
      return;
    }

    setEnrollment(null);
    setCode("");
    setName("");
    setNotice("La double authentification est activée pour cet appareil.");
    await load();
    setBusy(false);
    router.refresh();
  }

  async function cancelEnroll() {
    if (!enrollment) return;
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
    setEnrollment(null);
    setCode("");
    setError(null);
  }

  async function remove(id: string) {
    if (!window.confirm("Retirer cet appareil ?")) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (removeError) {
      setError("Le retrait a échoué. Réessayez.");
      setBusy(false);
      return;
    }

    setNotice("Appareil retiré.");
    await load();
    setBusy(false);
    router.refresh();
  }

  const noFactor = factors !== null && factors.length === 0;
  const onlyOne = factors !== null && factors.length === 1;

  return (
    <div className="grid max-w-3xl gap-6">
      {noFactor && (
        <p className="rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          La double authentification est obligatoire pour utiliser
          l&apos;application. Ajoutez votre premier appareil ci-dessous.
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Appareils enregistrés</h2>
        {factors === null ? (
          <p className="mt-3 text-sm text-muted">Chargement...</p>
        ) : factors.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucun appareil enregistré.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {factors.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{f.friendly_name || "Appareil"}</span>
                  <span className="text-muted">
                    {" "}
                    ajouté le {new Date(f.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  disabled={busy || onlyOne}
                  title={
                    onlyOne
                      ? "Ajoutez d'abord un deuxième appareil avant de retirer celui-ci."
                      : undefined
                  }
                  className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
        {onlyOne && (
          <p className="mt-3 text-xs text-muted">
            Pour retirer le seul appareil enregistré, ajoutez d&apos;abord un
            deuxième appareil.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Ajouter un appareil</h2>

        {!enrollment ? (
          <div className="mt-3">
            <p className="text-sm text-muted">
              Il vous faut une application d&apos;authentification sur votre
              téléphone (par exemple Google Authenticator, Microsoft
              Authenticator, Aegis ou votre gestionnaire de mots de passe).
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="friendly" className="text-sm font-medium">
                  Nom de l&apos;appareil (facultatif)
                </label>
                <input
                  id="friendly"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Téléphone"
                  className={field}
                />
              </div>
              <button
                type="button"
                onClick={startEnroll}
                disabled={busy || factors === null}
                className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white disabled:opacity-60 dark:text-black"
              >
                Ajouter un appareil
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>Ouvrez votre application d&apos;authentification.</li>
              <li>Scannez ce QR code (ou saisissez la clé secrète ci-dessous).</li>
              <li>Saisissez le code à 6 chiffres qu&apos;elle affiche.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrollment.qr}
              alt="QR code à scanner avec votre application d'authentification"
              width={192}
              height={192}
              className="mt-4 rounded-lg bg-white p-2"
            />
            <p className="mt-3 text-xs text-muted">Clé secrète (à ranger dans votre gestionnaire de mots de passe) :</p>
            <p className="mt-1 break-all rounded-lg bg-background px-3 py-2 font-mono text-sm">
              {enrollment.secret}
            </p>

            <form onSubmit={confirmEnroll} className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="code" className="text-sm font-medium">
                  Code à 6 chiffres
                </label>
                <input
                  id="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className={`${field} w-40 text-center tracking-widest`}
                />
              </div>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white disabled:opacity-60 dark:text-black"
              >
                Activer
              </button>
              <button
                type="button"
                onClick={cancelEnroll}
                disabled={busy}
                className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium hover:border-brand"
              >
                Annuler
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Si vous perdez votre téléphone
        </h2>
        <p className="mt-2">
          Il n&apos;existe pas de codes de secours : sans appareil enregistré,
          vous ne pourrez plus vous connecter. Pour éviter cela, enregistrez un
          deuxième appareil (une autre application ou un autre téléphone) et
          conservez la clé secrète dans un gestionnaire de mots de passe.
        </p>
      </section>
    </div>
  );
}
