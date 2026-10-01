"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { updateProfile } from "@/lib/db";
import { store } from "@/lib/store";
import { LetterboxdImport } from "./LetterboxdImport";
import { Wordmark } from "./Wordmark";
import { useProfile } from "./ProfileProvider";

const FLAG = "projo.intro.v1";
const EVENT = "projo:welcome";

/** Rouvre la présentation (Paramètres → Présentation). */
export const openWelcome = () => window.dispatchEvent(new Event(EVENT));

const FEATURES = [
  { k: "Découvrir", t: "Une idée par jour", d: "Un film, un cinéaste ou un mouvement, avec la raison de le voir. Tu peux aussi décrire ce que tu cherches avec tes mots." },
  { k: "Parcours", t: "Ce qu'il te manque", d: "La filmographie d'un cinéaste, un mouvement, un palmarès : tu vois ce que tu as déjà vu et ce que tu possèdes." },
  { k: "Journal", t: "Garde la trace", d: "Marque un film comme vu, note-le, ajoute la date et un mot si tu veux. Ta liste à voir est dans le même endroit." },
  { k: "Collection", t: "Ton étagère", d: "Tes Blu-ray, 4K et DVD rangés comme chez toi, avec une étagère qui se colore à mesure que tu les vois." },
];

/** Dos de boîtier de démonstration : e = vide, h = à moitié (vu ou possédé), f = en entier (les deux). */
const DEMO: ["e" | "h" | "f", number][] = [
  ["f", 345], ["f", 215], ["h", 30], ["f", 265], ["h", 190], ["e", 0], ["h", 330], ["f", 150], ["e", 0], ["h", 285], ["e", 0], ["f", 20], ["e", 0], ["h", 240],
];

function VisJournal() {
  const rows: [string, string, string, string][] = [
    ["12", "Chungking Express", "1994", "★★★★½"],
    ["9", "Le Samouraï", "1967", "★★★★"],
    ["4", "Persona", "1966", "★★★★★"],
  ];
  return (
    <div className="ob-card ob-journal" aria-hidden="true">
      <p className="label">Octobre 2026</p>
      {rows.map(([d, t, y, s]) => (
        <div key={t} className="ob-row">
          <span className="ob-day">{d}</span>
          <span className="ob-t">{t}</span>
          <span className="ob-y">{y}</span>
          <span className="ob-st">{s}</span>
        </div>
      ))}
      <p className="ob-hint">+ Journaliser : un film, une date, une note</p>
    </div>
  );
}

function VisShelf() {
  return (
    <div className="ob-card" aria-hidden="true">
      <p className="label">Parcours · Nouvelle Vague</p>
      <p className="ob-count">
        <b>8</b> / 14 <span>vus · 5 possédés</span>
      </p>
      <div className="ob-shelf">
        {DEMO.map(([s, h], i) => (
          <i key={i} className={`obs ${s}`} style={{ "--h": h } as React.CSSProperties} />
        ))}
      </div>
      <ul className="ob-legend">
        <li><i className="obs e" /> à voir</li>
        <li><i className="obs h" style={{ "--h": 30 } as React.CSSProperties} /> vu ou possédé</li>
        <li><i className="obs f" style={{ "--h": 30 } as React.CSSProperties} /> vu et possédé</li>
      </ul>
    </div>
  );
}

function VisToday() {
  return (
    <div className="ob-card ob-today" aria-hidden="true">
      <p className="label">Aujourd'hui · Pour continuer</p>
      <p className="ob-why">Tu as vu <b>Zodiac</b> hier. <b>David Fincher</b> a aussi réalisé, en 1995 :</p>
      <p className="ob-title">Se<span>7en</span></p>
      <div className="ob-ask">Un thriller coréen, après 2010…</div>
    </div>
  );
}

/**
 * Présentation de Filmable à la première connexion : quelques cartes (ce que fait l'appli), puis l'import
 * de Letterboxd, qu'on peut remettre à plus tard. Se rouvre depuis Paramètres.
 */
export function Welcome() {
  const d = useProfile();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [imported, setImported] = useState(false);
  const decided = useRef(false);
  const LAST = 4;

  // première connexion : aucun film enregistré, présentation jamais vue
  useEffect(() => {
    if (decided.current || d.status !== "ready") return;
    decided.current = true;
    if (d.empty && !d.profile?.settings?.onboarded && !store.get(FLAG, false)) setOpen(true);
  }, [d.status, d.empty, d.profile]);

  useEffect(() => {
    const on = () => {
      setI(0);
      setImported(false);
      setOpen(true);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  useEffect(() => {
    if (open && ref.current && !ref.current.open) ref.current.showModal();
  }, [open]);
  useEffect(() => head.current?.focus(), [i, open]);

  const finish = (next?: string) => {
    store.set(FLAG, true);
    setOpen(false);
    ref.current?.close();
    if (d.sb && d.userId && !d.profile?.settings?.onboarded) updateProfile(d.sb, d.userId, { settings: { ...(d.profile?.settings ?? {}), onboarded: true } }).catch(() => {});
    if (next) router.push(next);
  };

  if (!open) return null;
  const go = (n: number) => setI(Math.max(0, Math.min(LAST, n)));

  return (
    <dialog
      ref={ref}
      className="welcome"
      aria-labelledby="welcome-title"
      onCancel={(e) => {
        e.preventDefault();
        finish();
      }}
      onKeyDown={(e) => {
        if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        if (e.key === "ArrowRight") go(i + 1);
        if (e.key === "ArrowLeft") go(i - 1);
      }}
    >
      <div className="welcome-in">
        <header className="welcome-top">
          <span className="brand">
            <Wordmark />
          </span>
          {i < LAST ? (
            <button type="button" className="link-btn quiet" onClick={() => finish()}>
              Passer la présentation
            </button>
          ) : null}
        </header>

        <div className="welcome-body" key={i}>
          {i === 0 ? (
            <div className="welcome-s welcome-intro">
              <p className="label">Bienvenue</p>
              <h2 id="welcome-title" tabIndex={-1} ref={head}>
                Vois et <span>possède</span> les films qui comptent.
              </h2>
              <p className="welcome-lede">Filmable est ton carnet de cinéma : ce que tu as vu, ce que tu possèdes, et par quoi continuer. Voilà comment ça marche.</p>
              <ul className="ob-cards">
                {FEATURES.map((f) => (
                  <li key={f.k} className="ob-feature">
                    <span className="label">{f.k}</span>
                    <b>{f.t}</b>
                    <span>{f.d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : i === 1 ? (
            <div className="welcome-s welcome-split">
              <div>
                <p className="label">Journal</p>
                <h2 id="welcome-title" tabIndex={-1} ref={head}>
                  Un journal en <span>deux clics</span>
                </h2>
                <p className="welcome-lede">
                  Sur la fiche d'un film, touche <b>Je l'ai vu</b> et mets une note. La date et un mot, c'est en plus, jamais obligatoire. Tes films à voir sont dans le même onglet.
                </p>
              </div>
              <VisJournal />
            </div>
          ) : i === 2 ? (
            <div className="welcome-s welcome-split">
              <div>
                <p className="label">Parcours et collection</p>
                <h2 id="welcome-title" tabIndex={-1} ref={head}>
                  Des étagères qui <span>se colorent</span>
                </h2>
                <p className="welcome-lede">
                  Suis la filmographie d'un cinéaste, un mouvement, un palmarès. Chaque film <b>vu</b> colore le dos à moitié, chaque disque <b>possédé</b> aussi ; quand c'est les deux, il est coloré en entier. Tu vois d'un coup d'œil ce qu'il te manque.
                </p>
              </div>
              <VisShelf />
            </div>
          ) : i === 3 ? (
            <div className="welcome-s welcome-split">
              <div>
                <p className="label">Découvrir</p>
                <h2 id="welcome-title" tabIndex={-1} ref={head}>
                  Trouve quoi <span>voir</span>
                </h2>
                <p className="welcome-lede">
                  Une idée par jour, toujours avec sa raison. Ou décris ton envie avec tes mots : « un film dans le style de Scorsese, mafia, après 2010 ». Pas de note prédite, pas d'algorithme opaque.
                </p>
              </div>
              <VisToday />
            </div>
          ) : (
            <div className="welcome-s welcome-split welcome-import">
              <div>
                <p className="label">Dernière étape</p>
                <h2 id="welcome-title" tabIndex={-1} ref={head}>
                  Tu viens de <span>Letterboxd</span> ?
                </h2>
                <p className="welcome-lede">
                  Importe tout ton historique en une fois : films vus, notes, journal, watchlist et listes. Tu peux aussi le faire plus tard, depuis les paramètres.
                </p>
              </div>
              <div className="ob-card welcome-drop">
                <LetterboxdImport onDone={() => setImported(true)} />
              </div>
            </div>
          )}
        </div>

        <footer className="welcome-foot">
          <span className="welcome-dots" role="group" aria-label="Écrans de la présentation">
            {Array.from({ length: LAST + 1 }, (_, k) => (
              <button key={k} type="button" aria-current={k === i} aria-label={`Écran ${k + 1} sur ${LAST + 1}`} onClick={() => go(k)} />
            ))}
          </span>
          <span className="welcome-nav">
            {i > 0 ? (
              <button type="button" className="btn ghost" onClick={() => go(i - 1)}>
                Retour
              </button>
            ) : null}
            {i < LAST ? (
              <button type="button" className="btn primary" onClick={() => go(i + 1)}>
                {i === 0 ? "C'est parti" : "Suivant"}
              </button>
            ) : imported ? (
              <button type="button" className="btn primary" onClick={() => finish("/decouvrir")}>
                Voir mes données
              </button>
            ) : (
              <>
                <button type="button" className="btn ghost" onClick={() => finish()}>
                  Plus tard
                </button>
                <button type="button" className="btn primary" onClick={() => finish("/decouvrir")}>
                  Commencer à zéro
                </button>
              </>
            )}
          </span>
        </footer>
      </div>
    </dialog>
  );
}
