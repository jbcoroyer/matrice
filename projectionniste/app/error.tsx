"use client";

import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="section view">
      <div className="sec-head">
        <div>
          <div className="kicker">Incident de projection</div>
          <h1>
            La pellicule <i>a sauté</i>
          </h1>
        </div>
      </div>
      <p className="status err">{error.message || "Une erreur est survenue."}</p>
      <div className="row-actions">
        <button type="button" className="btn primary" onClick={reset}>
          Réessayer
        </button>
        <Link className="btn" href="/">
          Retour à la une
        </Link>
      </div>
    </section>
  );
}
