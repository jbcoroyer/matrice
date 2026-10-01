"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { errorText } from "@/lib/errors";
import { store } from "@/lib/store";
import { openQuickLog } from "./QuickLog";
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
  const msg = errorText(error);
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

/** Page vide : une phrase qui dit à quoi sert la page, et de quoi la remplir. */
export function EmptyState({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="gate empty-state">
      <h2>{title}</h2>
      <p className="note">{children}</p>
      {actions ? <div className="row-actions">{actions}</div> : null}
    </div>
  );
}

/** Les deux gestes qui remplissent presque toutes les pages : journaliser un film, importer Letterboxd. */
export function StartActions() {
  return (
    <>
      <button type="button" className="btn primary" onClick={openQuickLog}>
        Journaliser un film
      </button>
      <Link className="btn ghost" href="/parametres#import">
        Importer mon Letterboxd
      </Link>
    </>
  );
}


/** Lien de retour en haut des pages secondaires. */
export function BackLink({ href = "/decouvrir", label = "Découvrir" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="back">
      ← {label}
    </Link>
  );
}
