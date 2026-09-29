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

/** Titre en deux graisses : premier mot plein, la suite en léger (« **Pour** toi »). */
export function duo(text: React.ReactNode) {
  if (typeof text !== "string") return text;
  const i = text.indexOf(" ");
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)} <span>{text.slice(i + 1)}</span>
    </>
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
      <H>{duo(title)}</H>
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

/** Attend que les données de l'utilisateur soient chargées. */
export function ProfileGate({ children }: { children: React.ReactNode }) {
  const { status, error, retry } = useProfile();
  if (status === "ready") return <>{children}</>;
  if (status === "error")
    return (
      <section className="gate">
        <h2>Impossible de charger tes données</h2>
        <ErrorLine error={new Error(error || "")} onRetry={retry} />
      </section>
    );
  return <SkeletonGrid n={12} />;
}

/** Invitation à importer son historique quand la base est vide. */
export function EmptyInvite() {
  const { empty } = useProfile();
  if (!empty) return null;
  return (
    <section className="gate">
      <h2>Bienvenue</h2>
      <p className="note">
        Ton historique est vide. Importe ton export Letterboxd (journal, notes, critiques, watchlist, listes) pour que les recommandations et
        l'indice se calent sur tes goûts. Sinon, commence simplement à marquer des films comme vus.
      </p>
      <div className="row-actions">
        <Link className="btn primary" href="/parametres#import">
          Importer mon Letterboxd
        </Link>
      </div>
    </section>
  );
}
