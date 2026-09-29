"use client";

import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="section">
      <div className="sec-head">
        <h1>Une erreur est survenue</h1>
      </div>
      <p className="status err">{error.message || "Quelque chose s'est mal passé."}</p>
      <div className="row-actions">
        <button type="button" className="btn primary" onClick={reset}>
          Réessayer
        </button>
        <Link className="btn" href="/">
          Retour à l'accueil
        </Link>
      </div>
    </section>
  );
}
