"use client";

import Link from "next/link";
import { useProfile } from "./ProfileProvider";

export function Toaster() {
  const { toasts, dismissToast } = useProfile();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.undo ? (
            <button
              type="button"
              className="undo"
              onClick={() => {
                t.undo!();
                dismissToast(t.id);
              }}
            >
              Annuler
            </button>
          ) : null}
          {t.link ? (
            <Link className="undo" href={t.link.href} onClick={() => dismissToast(t.id)}>
              {t.link.label}
            </Link>
          ) : null}
          <button type="button" aria-label="Fermer" onClick={() => dismissToast(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function FooterStats() {
  const { status, seen, rated, watchlist } = useProfile();
  if (status !== "ready") return <span />;
  return (
    <span>
      {seen.size.toLocaleString("fr-FR")} films vus · {rated.size.toLocaleString("fr-FR")} notes · {watchlist.size.toLocaleString("fr-FR")} en watchlist
    </span>
  );
}
