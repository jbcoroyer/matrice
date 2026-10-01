"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createAccount, sendReset, signIn, signUp } from "@/lib/auth";
import { img, tmdb } from "@/lib/tmdb";
import type { Movie, Paged } from "@/lib/types";
import { useProfile } from "./ProfileProvider";
import { ErrorLine } from "./ui";
import { Wordmark } from "./Wordmark";

function Field({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label}
      <input className="input" {...p} />
    </label>
  );
}

/** Écran d'accueil pour les personnes non connectées (ou ancienne session sans compte). */
export function AuthScreen() {
  const { sb, status, empty, retry, sessionExpired } = useProfile();
  const guest = status === "guest";
  const [mode, setMode] = useState<"signin" | "signup">(guest ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [info, setInfo] = useState<string | null>(null);
  // après une suppression de compte : un mot de confirmation
  useEffect(() => {
    if (new URLSearchParams(location.search).get("compte") === "supprime") {
      setInfo("Ton compte et toutes tes données ont été supprimés. Merci d'être passé.");
      history.replaceState(null, "", "/");
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        await signIn(sb, email, pw);
        retry();
      } else if (guest) {
        // ancienne session sans compte : on la transforme, les données restent
        const acc = await createAccount(sb, email, pw);
        if (acc.pendingEmail) setInfo(`Un email de confirmation vient d'être envoyé à ${acc.pendingEmail}. Clique sur le lien qu'il contient, puis reviens ici.`);
        else retry();
      } else {
        const r = await signUp(sb, email, pw);
        if (r === "confirm") setInfo(`Un email de confirmation vient d'être envoyé à ${email}. Clique sur le lien qu'il contient pour activer ton compte.`);
        else retry();
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-scene">
      <PosterWall />
      <div className="wrap auth">
        <div className="auth-pitch">
          <div className="auth-head">
            <h1>
              <Wordmark />
            </h1>
            <p className="auth-promise">
              Vois et <span>possède</span> les films qui comptent.
            </p>
          </div>
          <div className="auth-more">
            <p>
              Un cinéaste, un mouvement, un palmarès : chaque film vu colore son dos, chaque disque sur ton étagère le remplit. Tu sais toujours ce que tu as vu, ce qu'il te manque, et par quoi continuer.
            </p>
            <p className="auth-try">
              Voir un parcours sans compte : <Link href="/ensembles/palmes-d-or">Palmes d'or</Link>
              {" · "}
              <Link href="/ensembles/nouvelle-vague">Nouvelle Vague</Link>
              {" · "}
              <Link href="/ensembles/studio-10342">Studio Ghibli</Link>
            </p>
            <p className="auth-import">Tu viens de Letterboxd ? Importe tout ton historique en une fois.</p>
            <nav className="auth-legal" aria-label="Informations légales">
              <Link href="/mentions-legales">Mentions légales</Link>
              <Link href="/confidentialite">Confidentialité</Link>
              <Link href="/conditions">Conditions</Link>
            </nav>
          </div>
        </div>
        <div className="auth-card">
          {guest && !empty ? (
            <p className="note">
              Ce navigateur contient des données enregistrées sans compte. Crée ton compte ici pour les conserver : elles lui seront rattachées.
            </p>
          ) : null}
          <div className="seg" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => setMode("signin")}>
              Se connecter
            </button>
            <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")}>
              Créer un compte
            </button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field
              label={mode === "signup" ? "Mot de passe (8 caractères minimum)" : "Mot de passe"}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            {mode === "signup" ? (
              <p className="note legal-note">
                En créant un compte, tu acceptes les <Link href="/conditions">conditions d'utilisation</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>.
              </p>
            ) : null}
            {sessionExpired ? <p className="status" role="status">Ta session a expiré. Reconnecte-toi pour retrouver tes données.</p> : null}
            {error ? <ErrorLine error={error} /> : null}
            {info ? <p className="status">{info}</p> : null}
            <div className="row-actions">
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? "Un instant…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
              </button>
              {mode === "signin" ? (
                <button
                  type="button"
                  className="link-btn quiet"
                  onClick={async () => {
                    if (!email) return setError(new Error("Indique ton email ci-dessus."));
                    try {
                      await sendReset(sb!, email);
                      setInfo("Si un compte existe pour cette adresse, un email de réinitialisation vient de partir.");
                    } catch (err) {
                      setError(err);
                    }
                  }}
                >
                  Mot de passe oublié
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

/** Mur d'affiches des films du moment, en fond de l'écran d'accueil. */
function PosterWall() {
  const [posters, setPosters] = useState<string[]>([]);
  useEffect(() => {
    Promise.all([1, 2].map((page) => tmdb<Paged<Movie>>("trending/movie/week", { page })))
      .then((ps) => setPosters([...new Set(ps.flatMap((p) => p.results).map((m) => m.poster_path).filter((x): x is string => !!x))].slice(0, 32)))
      .catch(() => {});
  }, []);
  return (
    <div className="auth-wall" aria-hidden>
      {posters.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={p} src={img(p, "w185")} alt="" />
      ))}
    </div>
  );
}

/** Pages lisibles sans compte : collection partagée, liste, parcours, fiche film, personne, studio. */
export const isPublicPath = (path: string) =>
  path.startsWith("/c/") || ["/mentions-legales", "/confidentialite", "/conditions"].includes(path) || /^\/(listes|ensembles)\/[^/]+$/.test(path) || /^\/(film|personne|studio)\/\d+$/.test(path);

/** Tout le site passe par ici : sans compte connecté, on affiche l'écran de connexion. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, error, retry } = useProfile();
  const path = usePathname();
  // pages publiques (chacune vérifie elle-même ce qu'elle a le droit de montrer)
  if (isPublicPath(path)) return <>{children}</>;
  if (status === "signedOut" || status === "guest") return <AuthScreen />;
  if (status === "error")
    return (
      <section className="gate">
        <h2>Impossible de charger tes données</h2>
        <ErrorLine error={new Error(error || "")} onRetry={retry} />
      </section>
    );
  if (status === "loading") return <div className="loader" role="status"><i />Chargement…</div>;
  return <>{children}</>;
}
