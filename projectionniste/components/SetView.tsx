"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { errorText } from "@/lib/errors";
import { frDate, plural } from "@/lib/format";
import { countable, follow, markCompleted, mySet, personKey, resolveDef, resolveFilms, setExcluded, syncSet, unfollow, upcoming, type Mode, type MySet, type Role, type SetDef, type SetFilm } from "@/lib/sets";
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

/** Où vit chaque intention : le rayon dans la Collection, le cycle dans le Journal. */
export const modeHref = (mode: Mode, key: string) => (mode === "own" ? `/collection?rayon=${key}` : `/journal?onglet=cycles&cycle=${key}`);

/** Une ligne de la page d'ensemble : « Dans ta collection : 4 sur 13 », avec son geste. */
function ModeLine({ mode, done, total, followed, completedAt, busy, onFollow, onStop, setKey }: {
  mode: Mode; done: number; total: number; followed: boolean; completedAt: string | null; busy: boolean; onFollow: () => void; onStop: () => void; setKey: string;
}) {
  const own = mode === "own";
  return (
    <div className="set-mode">
      <p className="label">{own ? "Dans ta collection" : "Dans ton parcours"}</p>
      <p className="set-count">
        <b>{done}</b> <span>sur {total}</span> {own ? "possédé" + (done > 1 ? "s" : "") : "vu" + (done > 1 ? "s" : "")}
      </p>
      {completedAt ? <p className="set-done">{own ? "Rayon complet" : "Cycle achevé"} · {frDate(completedAt.slice(0, 10), { month: "long", year: "numeric" })}</p> : null}
      <div className="row-actions">
        {followed ? (
          <>
            <Link className="btn" href={modeHref(mode, setKey)}>
              {own ? "Voir le rayon" : "Voir le cycle"}
            </Link>
            <button type="button" className="link-btn quiet" disabled={busy} onClick={onStop}>
              {own ? "Fermer le rayon" : "Arrêter le cycle"}
            </button>
          </>
        ) : (
          <button type="button" className={own ? "btn primary" : "btn"} disabled={busy || !total} onClick={onFollow}>
            {own ? "Ouvrir un rayon" : "Commencer le cycle"}
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
        <Link className="btn primary" href="/ensembles">
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
        <Link href="/ensembles" className="back">
          ← Rayons et cycles
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
            <ModeLine
              mode="own" setKey={setKey} done={owned} total={counted.length} followed={!!fol("own")} completedAt={fol("own")?.completed_at ?? null} busy={busy}
              onFollow={() => act(() => follow(d.sb!, def, films, "own"), `Rayon « ${def.title} » ouvert dans ta collection`)}
              onStop={() => mine && act(() => unfollow(d.sb!, mine.id, "own"), `Rayon « ${def.title} » fermé`)}
            />
            <ModeLine
              mode="watch" setKey={setKey} done={seenN} total={counted.length} followed={!!fol("watch")} completedAt={fol("watch")?.completed_at ?? null} busy={busy}
              onFollow={() => act(() => follow(d.sb!, def, films, "watch"), `Cycle « ${def.title} » commencé dans ton journal`)}
              onStop={() => mine && act(() => unfollow(d.sb!, mine.id, "watch"), `Cycle « ${def.title} » arrêté`)}
            />
          </div>
        ) : !signedIn && d.status !== "loading" ? (
          <p className="note">
            <Link className="link" href="/">Crée un compte</Link> pour ouvrir un rayon (les posséder) ou commencer un cycle (les voir).
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
        {adjust ? <p className="note">« Ne pas compter » retire un film du rayon et du cycle (un caméo, un film introuvable…).</p> : null}
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
