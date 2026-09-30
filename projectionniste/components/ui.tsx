"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

const ONBOARD_KEY = "projo.v3.onboard";

/** Premier lancement (aucun film vu, noté ni en watchlist) : trois gestes pour démarrer. */
export function Onboarding() {
  const { empty } = useProfile();
  const [hidden, setHidden] = useState(true);
  useEffect(() => setHidden(store.get(ONBOARD_KEY, false)), []);
  if (!empty || hidden) return null;
  return (
    <section className="onboard" aria-labelledby="onboard-title">
      <p className="label">Pour commencer</p>
      <h1 id="onboard-title">
        Bienvenue sur <span>Filmable</span>
      </h1>
      <ol className="onboard-steps">
        <li>
          <b>Importe ton Letterboxd</b>
          <p>Notes, journal, critiques, watchlist et listes sont repris d'un coup. Les recommandations se calent tout de suite sur tes goûts.</p>
          <Link className="btn primary" href="/parametres#import">
            Importer
          </Link>
        </li>
        <li>
          <b>Ou journalise un premier film</b>
          <p>Le dernier que tu as vu : la date, ta note, une critique si tu veux. Le journal nourrit ton bilan de l'année.</p>
          <button type="button" className="btn" onClick={openQuickLog}>
            Journaliser un film
          </button>
        </li>
        <li>
          <b>Note ce que tu connais</b>
          <p>Dans les tendances ci-dessous, ouvre un film que tu as vu et donne-lui une note : « Pour toi » et l'indice apparaissent dès les premières.</p>
        </li>
      </ol>
      <button
        type="button"
        className="link-btn quiet"
        onClick={() => {
          store.set(ONBOARD_KEY, true);
          setHidden(true);
        }}
      >
        Masquer ce guide
      </button>
    </section>
  );
}
