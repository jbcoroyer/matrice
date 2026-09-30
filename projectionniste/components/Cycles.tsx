"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { check } from "@/lib/supabase";
import { DIARY_EVENT } from "@/lib/diary";
import { errorText } from "@/lib/errors";
import { frDate, plural } from "@/lib/format";
import { followedIn, markCompleted, mySets, setItems, unfollow, type MySet, type SetItem } from "@/lib/sets";
import { LogDialog } from "./LogDialog";
import { useProfile, type FilmInput } from "./ProfileProvider";
import { StarsText } from "./Stars";
import { TitleDuo } from "./TitleDuo";
import { Loader } from "./ui";

const SHOWN = 3;
type Cycle = ReturnType<typeof followedIn>[number];

const shortDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Un cycle comme un programme de cinémathèque : une séance par ligne, datée quand elle a eu lieu. */
function Programme({ c, onBack, onChange }: { c: Cycle; onBack: () => void; onChange: () => void }) {
  const d = useProfile();
  const [dates, setDates] = useState<Map<number, string>>(new Map());
  const [logging, setLogging] = useState<FilmInput | null>(null);
  const ids = useMemo(() => c.films.map((f) => f.tmdb_id), [c.films]);

  const loadDates = useCallback(() => {
    if (!d.sb || !d.userId || !ids.length) return;
    d.sb
      .from("diary_entries")
      .select("tmdb_id, watched_on")
      .eq("user_id", d.userId)
      .in("tmdb_id", ids)
      .not("watched_on", "is", null)
      .then((res) => {
        const rows = check(res) as { tmdb_id: number; watched_on: string }[];
        const m = new Map<number, string>();
        // la dernière séance fait foi
        for (const r of rows) if (!m.get(r.tmdb_id) || r.watched_on > m.get(r.tmdb_id)!) m.set(r.tmdb_id, r.watched_on);
        setDates(m);
      }, () => {});
  }, [d.sb, d.userId, ids]);
  useEffect(() => {
    loadDates();
    window.addEventListener(DIARY_EVENT, loadDates);
    return () => window.removeEventListener(DIARY_EVENT, loadDates);
  }, [loadDates]);

  const seenN = c.films.filter((f) => d.seen.has(f.tmdb_id)).length;
  const ownedN = c.films.filter((f) => d.owned.has(f.tmdb_id)).length;
  const stop = async () => {
    try {
      await unfollow(d.sb!, c.set.id, "watch");
      d.toast(`Cycle « ${c.set.title} » arrêté`);
      onChange();
      onBack();
    } catch (e) {
      d.toast(`Échec : ${errorText(e)}`);
    }
  };

  return (
    <section className="programme" aria-labelledby="prog-title">
      <button type="button" className="back" onClick={onBack}>
        ← Tous les cycles
      </button>
      <p className="label">Cycle · {c.set.subtitle}</p>
      <h2 id="prog-title">
        <Link href={`/ensembles/${c.set.key}`}>
          <TitleDuo title={c.set.title} />
        </Link>
      </h2>
      <p className="prog-count">
        <b>{seenN}</b> {seenN > 1 ? "séances" : "séance"} sur {c.films.length}
        {c.follow.completed_at ? <span className="prog-done"> · achevé le {frDate(c.follow.completed_at.slice(0, 10))}</span> : null}
      </p>
      <ol className="prog-list">
        {c.films.map((f) => {
          const seen = d.seen.has(f.tmdb_id);
          const date = dates.get(f.tmdb_id);
          const r = d.rated.get(f.tmdb_id);
          const title = f.films?.title ?? "Film";
          return (
            <li key={f.tmdb_id} className={seen ? "seen" : undefined}>
              <span className="prog-y">{(f.release_date || f.films?.release_date || "").slice(0, 4) || "—"}</span>
              <Link href={`/film/${f.tmdb_id}`} className="prog-t">
                {title}
              </Link>
              {f.caption ? <span className="prog-cap">{f.caption}</span> : null}
              {d.owned.has(f.tmdb_id) ? <span className="prog-own" title="Tu le possèdes">possédé</span> : null}
              <span className="prog-dots" aria-hidden="true" />
              {seen ? (
                <span className="prog-seen">
                  {date ? `vu le ${shortDate(date)}` : "vu"}
                  {r ? (
                    <>
                      {" "}
                      <StarsText value={r} />
                    </>
                  ) : null}
                </span>
              ) : (
                <span className="prog-todo">
                  à voir{" "}
                  <button type="button" className="link-btn" onClick={() => setLogging({ id: f.tmdb_id, title, release_date: f.release_date ?? undefined, poster_path: f.films?.poster_path })}>
                    Journaliser
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="prog-foot">
        <Link className="link" href={`/ensembles/${c.set.key}`}>
          Dans ta collection : {ownedN} sur {c.films.length}
        </Link>
        <button type="button" className="link-btn quiet" onClick={stop}>
          Arrêter le cycle
        </button>
      </p>
      {logging ? <LogDialog film={logging} onClose={() => setLogging(null)} onSaved={loadDates} /> : null}
    </section>
  );
}

/** L'onglet Cycles du journal : ce que tu es en train de voir, ensemble par ensemble. */
export function Cycles() {
  const d = useProfile();
  const [sets, setSets] = useState<MySet[] | null>(null);
  const [items, setItemsState] = useState<SetItem[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  const load = useCallback(() => {
    if (!d.sb) return;
    (async () => {
      const s = (await mySets(d.sb!)).filter((x) => x.follows.some((f) => f.mode === "watch"));
      setItemsState(await setItems(d.sb!, s.map((x) => x.id)));
      setSets(s);
    })().catch(() => setSets([]));
  }, [d.sb]);
  useEffect(load, [load]);

  useEffect(() => {
    const read = () => setOpen(new URLSearchParams(location.search).get("cycle"));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  const go = (key: string | null) => {
    history.pushState({}, "", key ? `?onglet=cycles&cycle=${key}` : "?onglet=cycles");
    setOpen(key);
    window.scrollTo({ top: 0 });
  };

  const cycles = useMemo(() => (sets ? followedIn(sets, items, "watch") : []), [sets, items]);
  const done = (c: Cycle) => c.films.filter((f) => d.seen.has(f.tmdb_id)).length;

  useEffect(() => {
    if (!d.sb) return;
    for (const c of cycles) if (!c.follow.completed_at && c.films.length && done(c) === c.films.length) markCompleted(d.sb, c.set.id, "watch", c.films.length).then(load, () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.sb, cycles, d.seen]);

  if (!sets) return <Loader text="Chargement de tes cycles…" />;
  const current = cycles.find((c) => c.set.key === open);
  if (current) return <Programme c={current} onBack={() => go(null)} onChange={load} />;

  const running = cycles.filter((c) => !c.follow.completed_at);
  const finished = cycles.filter((c) => c.follow.completed_at).sort((a, b) => b.follow.completed_at!.localeCompare(a.follow.completed_at!));
  const shown = all ? running : running.slice(0, SHOWN);

  return (
    <section className="cycles">
      {!cycles.length ? (
        <div className="empty-state">
          <h2>Aucun cycle pour l'instant</h2>
          <p className="note">
            Un cycle, c'est un ensemble de films que tu décides de voir : une rétrospective Kubrick, le Studio Ghibli, les Palmes d'or… Chaque film vu y prend sa date,
            comme sur un programme de cinémathèque.
          </p>
          <div className="row-actions">
            <Link className="btn primary" href="/ensembles">
              Choisir un cycle
            </Link>
          </div>
        </div>
      ) : (
        <>
          {running.length ? (
            <>
              <h2 className="label cycles-h">À l'affiche</h2>
              <ul className="cycle-list">
                {shown.map((c) => (
                  <li key={c.set.id}>
                    <button type="button" className="cycle-row" onClick={() => go(c.set.key)}>
                      <span className="cycle-t">
                        <TitleDuo title={c.set.title} />
                      </span>
                      <span className="cycle-k">{c.set.subtitle}</span>
                      <span className="cycle-n">
                        {done(c)} <i>{done(c) > 1 ? "séances" : "séance"} sur {c.films.length}</i>
                      </span>
                      <span className="cycle-strip" aria-hidden="true">
                        {c.films.slice(0, 60).map((f) => (
                          <i key={f.tmdb_id} className={d.seen.has(f.tmdb_id) ? "on" : undefined} />
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {running.length > SHOWN ? (
                <button type="button" className="link-btn" onClick={() => setAll((v) => !v)}>
                  {all ? "Ne montrer que les trois premiers" : `Autres cycles (${running.length - SHOWN})`}
                </button>
              ) : null}
            </>
          ) : null}
          {finished.length ? (
            <>
              <h2 className="label cycles-h">Cycles achevés</h2>
              <ul className="cycle-list done">
                {finished.map((c) => (
                  <li key={c.set.id}>
                    <button type="button" className="cycle-row" onClick={() => go(c.set.key)}>
                      <span className="cycle-t">
                        <TitleDuo title={c.set.title} />
                      </span>
                      <span className="cycle-k">
                        {frDate(c.follow.started_at.slice(0, 10), { month: "long", year: "numeric" })} – {frDate(c.follow.completed_at!.slice(0, 10), { month: "long", year: "numeric" })}
                      </span>
                      <span className="cycle-n">
                        {plural(c.follow.completed_count ?? c.films.length, "film")}
                        {c.films.length > (c.follow.completed_count ?? 0) ? <i> · {plural(c.films.length - (c.follow.completed_count ?? 0), "nouveau", "nouveaux")} depuis</i> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="note cycles-more">
            <Link className="link" href="/ensembles">
              Commencer un autre cycle
            </Link>{" "}
            · ou depuis la fiche d'un cinéaste.
          </p>
        </>
      )}
    </section>
  );
}
