"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { signOut } from "@/lib/auth";
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

/** Session refusée par le serveur : les changements ne sont plus enregistrés, on propose de se reconnecter. */
export function SessionBanner() {
  const { sessionExpired, status, sb } = useProfile();
  if (!sessionExpired || status !== "ready") return null;
  return (
    <div className="session-banner" role="alert">
      <span>Ta session a expiré : tes dernières modifications n'ont peut-être pas été enregistrées.</span>
      <button type="button" className="btn primary" onClick={() => sb && signOut(sb)}>
        Se reconnecter
      </button>
    </div>
  );
}

/** Fenêtre de confirmation (remplace window.confirm) : Échap ou « Annuler » refuse. */
export function ConfirmHost() {
  const { ask, answer } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (ask && d && !d.open) d.showModal();
  }, [ask]);
  if (!ask) return null;
  return (
    <dialog ref={ref} className="dialog confirm" aria-labelledby="confirm-title" onCancel={(e) => (e.preventDefault(), answer(false))}>
      <h2 id="confirm-title">{ask.title ?? "Confirmer"}</h2>
      <p className="note">{ask.message}</p>
      <div className="dialog-actions">
        <span style={{ flex: 1 }} />
        <button type="button" className="btn ghost" autoFocus onClick={() => answer(false)}>
          Annuler
        </button>
        <button type="button" className={ask.danger ? "btn danger" : "btn primary"} onClick={() => answer(true)}>
          {ask.confirmLabel ?? "Confirmer"}
        </button>
      </div>
    </dialog>
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
