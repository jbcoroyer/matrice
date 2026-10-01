"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { errorText } from "@/lib/errors";
import { frDate, plural } from "@/lib/format";
import { countable, followBoth, markCompleted, mySet, personKey, resolveDef, resolveFilms, setExcluded, syncSet, unfollowAll, upcoming, type Mode, type MySet, type Role, type SetDef, type SetFilm } from "@/lib/sets";
import { img } from "@/lib/tmdb";
import type { Ranked } from "@/lib/types";
import { nextIn } from "@/lib/discover";
import { yearOf } from "@/lib/format";
import { FilmCard } from "./FilmCard";
import { TrailMark } from "./Trail";
import { useProfile } from "./ProfileProvider";
import { TitleDuo } from "./TitleDuo";
import { ErrorLine, Loader } from "./ui";

const DAY = 86400000;
/** Les ensembles copiés avant cette date sont remis à jour une fois (la sélection éditoriale a changé). */
const EDITORIAL_REV = +new Date("2026-09-30T13:50:00Z");
const ROLE_TAB: Record<Role, string> = { director: "Réalisation", main: "Rôles principaux", all: "Toute la filmographie" };

/** Où retrouver un parcours suivi. */
export const modeHref = (_mode: Mode, key: string) => `/parcours?p=${key}`;

/** « Ton parcours : 9 vus sur 13, 4 possédés » et le seul geste : suivre, ou ne plus suivre. */
function ParcoursLine({ seenN, ownedN, total, followed, busy, onFollow, onStop, setKey }: {
  seenN: number; ownedN: number; total: number; followed: boolean; busy: boolean; onFollow: () => void; onStop: () => void; setKey: string;
}) {
  return (
    <div className="set-mode">
      <p className="label">Ton parcours</p>
      <p className="set-count">
        <b>{seenN}</b> <span>sur {total} vus</span> · <b>{ownedN}</b> <span>possédé{ownedN > 1 ? "s" : ""}</span>
      </p>
      <div className="row-actions">
        {followed ? (
          <>
            <Link className="btn" href={`/parcours?p=${setKey}`}>
              Voir dans mes parcours
            </Link>
            <button type="button" className="link-btn quiet" disabled={busy} onClick={onStop}>
              Ne plus suivre
            </button>
          </>
        ) : (
          <button type="button" className="btn primary" disabled={busy || !total} onClick={onFollow}>
            Suivre ce parcours
          </button>
        )}
      </div>
    </div>
  );
}

/** La page d'un ensemble : neutre, comme une fiche ; les deux intentions y sont côte à côte. */
export function SetView({ setKey }: { setKey: string }) {
  const d = useProfile();
  const signedIn = d.status === "ready";
  const [def, setDef] = useState<SetDef | null | undefined>(undefined);
  const [films, setFilms] = useState<SetFilm[] | null>(null);
  const [mine, setMine] = useState<MySet | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [adjust, setAdjust] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const loadMine = useCallback(() => {
    if (d.sb && signedIn) mySet(d.sb, setKey).then(setMine, () => {});
  }, [d.sb, signedIn, setKey]);

  useEffect(() => {
    const ctl = new AbortController();
    setError(null);
    (async () => {
      const x = await resolveDef(setKey);
      if (ctl.signal.aborted) return;
      setDef(x);
      if (x) setFilms(await resolveFilms(x, ctl.signal));
    })().catch((e) => !ctl.signal.aborted && setError(e));
    return () => ctl.abort();
  }, [setKey, attempt]);
  useEffect(loadMine, [loadMine]);

  // ensemble suivi : sa copie est remise à jour (au plus une fois par jour)
  useEffect(() => {
    if (!d.sb || !def || !films || !mine || (mine.synced_at && +new Date(mine.synced_at) > EDITORIAL_REV && Date.now() - +new Date(mine.synced_at) < DAY)) return;
    syncSet(d.sb, def, films).then(loadMine, () => {});
  }, [d.sb, def, films, mine, loadMine]);

  const excluded = useMemo(() => new Set((mine?.exclusions ?? []).map((x) => x.tmdb_id)), [mine]);
  const counted = useMemo(() => (films ? countable(films, excluded) : []), [films, excluded]);
  const owned = counted.filter((m) => d.owned.has(m.id)).length;
  const seenN = counted.filter((m) => d.seen.has(m.id)).length;
  const fol = (mode: Mode) => mine?.follows.find((f) => f.mode === mode) ?? null;

  // complétion : notée une seule fois
  useEffect(() => {
    if (!d.sb || !mine || !counted.length) return;
    for (const [mode, done] of [["own", owned], ["watch", seenN]] as const) {
      const f = mine.follows.find((x) => x.mode === mode);
      if (f && !f.completed_at && done === counted.length) markCompleted(d.sb, mine.id, mode, counted.length).then(loadMine, () => {});
    }
  }, [d.sb, mine, counted.length, owned, seenN, loadMine]);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      loadMine();
      d.toast(message);
    } catch (e) {
      d.toast(`Échec : ${errorText(e)}`);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorLine error={error} onRetry={() => setAttempt((a) => a + 1)} />;
  if (def === undefined) return <Loader text="Chargement…" />;
  if (!def)
    return (
      <section className="gate">
        <h1>Ensemble introuvable</h1>
        <p className="note">Ce lien ne correspond à aucun ensemble de films.</p>
        <Link className="btn primary" href="/parcours">
          Voir le catalogue
        </Link>
      </section>
    );

  const person = def.source === "person" ? def.sourceRef : null;
  const role = def.rules.role as Role | undefined;
  const cover = films?.find((m) => m.backdrop_path)?.backdrop_path;
  const counting = counted.filter((m) => !excluded.has(m.id));
  const next = films ? (def.source === "tmdb_collection" ? counting.find((m) => !d.seen.has(m.id)) ?? null : nextIn(counting, signedIn ? d.seen : new Set())) : null;
  const list: Ranked[] = (films ?? []).map((m) => ({ ...m, _note: [m.caption, upcoming(m) ? "À venir" : "", excluded.has(m.id) ? "Ne compte pas" : ""].filter(Boolean).join(" · ") || undefined }));

  return (
    <article className="set-page">
      <header className="set-hero">
        {cover ? (
          <div className="chero-bg" aria-hidden="true">
            <img src={img(cover, "w780")} alt="" />
          </div>
        ) : null}
        <Link href="/parcours" className="back">
          ← Parcours
        </Link>
        <p className="label">{def.kicker}</p>
        <h1>
          {person ? <Link href={`/personne/${person}`}><TitleDuo title={def.title} /></Link> : <TitleDuo title={def.title} />}
        </h1>
        {def.description ? <p className="lede">{def.description}</p> : null}
        {person ? (
          <div className="seg set-roles" role="group" aria-label="Quelle filmographie">
            {(["director", "main", "all"] as Role[]).map((r) => (
              <Link key={r} href={`/ensembles/${personKey(+person, r)}`} aria-current={r === role ? "page" : undefined}>
                {ROLE_TAB[r]}
              </Link>
            ))}
          </div>
        ) : null}
        <p className="set-rule">
          {def.rule} {films ? <b>{plural(counted.length, "film")}{films.length > counted.length ? ` (et ${films.length - counted.length} à venir ou exclus)` : ""}.</b> : null}
        </p>

        {next ? (
          <Link href={`/film/${next.id}`} className="set-next">
            {next.poster_path ? <img src={img(next.poster_path, "w92")} alt="" /> : null}
            <span>
              <span className="label">{signedIn && seenN ? "Et ensuite" : "Par où commencer"}</span>
              <b>{next.title}</b>
              <span className="dim"> · {yearOf(next)}</span>
            </span>
          </Link>
        ) : null}
        <TrailMark href={`/ensembles/${setKey}`} label={def.title} />

        {signedIn && films ? (
          <div className="set-modes">
            <ParcoursLine
              setKey={setKey} seenN={seenN} ownedN={owned} total={counted.length} busy={busy}
              followed={!!mine?.follows.some((f) => !f.archived_at)}
              onFollow={() => act(() => followBoth(d.sb!, def, films, mine?.follows.filter((f) => !f.archived_at).map((f) => f.mode) ?? []), `Parcours « ${def.title} » suivi : tu le retrouves dans Parcours`)}
              onStop={() => mine && act(() => unfollowAll(d.sb!, mine.id, mine.follows.filter((f) => !f.archived_at).map((f) => f.mode)), `Parcours « ${def.title} » arrêté`)}
            />
          </div>
        ) : !signedIn && d.status !== "loading" ? (
          <p className="note">
            <Link className="link" href="/">Crée un compte</Link> pour suivre ce parcours : ce que tu as vu, ce que tu possèdes, et la suite.
          </p>
        ) : null}
      </header>

      <section className="section">
        <div className="sec-head">
          <h2>
            Les <span>films</span>
          </h2>
          {mine ? (
            <button type="button" className="btn ghost small" aria-pressed={adjust} onClick={() => setAdjust((v) => !v)}>
              {adjust ? "Terminer" : "Ajuster"}
            </button>
          ) : null}
        </div>
        {adjust ? <p className="note">« Ne pas compter » retire un film du parcours (un caméo, un film introuvable…).</p> : null}
        {!films ? (
          <Loader text="Recherche des films…" />
        ) : !films.length ? (
          <p className="status">Aucun film trouvé pour cet ensemble.</p>
        ) : (
          <div className="grid set-grid">
            {list.map((m) => (
              <div key={m.id} className={`set-film${excluded.has(m.id) ? " out" : ""}`}>
                <FilmCard m={m} />
                {adjust && mine ? (
                  <button
                    type="button"
                    className="link-btn quiet"
                    onClick={() => act(() => setExcluded(d.sb!, mine.id, m.id, !excluded.has(m.id)), excluded.has(m.id) ? `« ${m.title} » compte à nouveau` : `« ${m.title} » ne compte plus`)}
                  >
                    {excluded.has(m.id) ? "Compter à nouveau" : "Ne pas compter"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
