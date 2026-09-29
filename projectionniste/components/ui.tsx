"use client";

import Link from "next/link";
import { useProfile } from "./ProfileProvider";

export function Loader({ text }: { text: string }) {
  return (
    <div className="loader" role="status">
      <i />
      {text}
    </div>
  );
}

export function SecHead({
  title,
  aside,
  as = "h2",
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  as?: "h1" | "h2";
}) {
  const H = as;
  return (
    <div className="sec-head">
      <H>{title}</H>
      {typeof aside === "string" ? <span className="aside">{aside}</span> : aside}
    </div>
  );
}

export function SkeletonGrid({ n = 10 }: { n?: number }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card">
          <div className="poster sk" />
          <div className="sk sk-line w40" />
          <div className="sk sk-line w80" />
          <div className="sk sk-line w60" />
        </div>
      ))}
    </div>
  );
}

export function ErrorLine({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : "Une erreur est survenue.";
  return (
    <p className="status err">
      {msg}{" "}
      {onRetry ? (
        <button type="button" className="link-btn" onClick={onRetry}>
          Réessayer
        </button>
      ) : null}
    </p>
  );
}

/** Case « Sur mes plateformes », partagée par toutes les rubriques. */
export function MineToggle() {
  const { prefs, platforms, updatePrefs } = useProfile();
  const enabled = platforms.size > 0;
  return (
    <label>
      <input
        type="checkbox"
        checked={prefs.onlyMine && enabled}
        disabled={!enabled}
        onChange={(e) => updatePrefs((p) => ({ ...p, onlyMine: e.target.checked }))}
      />
      Sur mes plateformes{" "}
      {!enabled ? (
        <em>
          (<Link href="/reglages">à choisir</Link>)
        </em>
      ) : null}
    </label>
  );
}

/** Attend que l'historique soit prêt ; affiche la progression à la première ouverture. */
export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { status, progress, error, retry } = useProfile();
  if (status === "ready") return <>{children}</>;
  if (status === "error")
    return (
      <section className="gate">
        <h2>L'historique n'a pas pu être lu</h2>
        <ErrorLine error={new Error(error || "")} onRetry={retry} />
      </section>
    );
  if (status === "mapping" && progress && progress.total > 1)
    return (
      <section className="gate">
        <h2>Lecture de ton historique</h2>
        <p className="note">
          Première visite : on relie tes {progress.total.toLocaleString("fr-FR")} films Letterboxd à leurs fiches TMDB. Une vingtaine de secondes, une seule fois.
        </p>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <i style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
        <p className="note">
          {progress.done.toLocaleString("fr-FR")} / {progress.total.toLocaleString("fr-FR")}
        </p>
      </section>
    );
  return <SkeletonGrid n={10} />;
}
