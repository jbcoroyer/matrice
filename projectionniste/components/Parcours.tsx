"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { frDate, plural, splitTitle } from "@/lib/format";
import { followedAll, markCompleted, mySets, parcoursState, setItems, type MySet, type Parcours, type SetItem } from "@/lib/sets";
import { img } from "@/lib/tmdb";
import { Catalogue } from "./Catalogue";
import { Paths } from "./Doors";
import { Eye } from "./icons";
import { useProfile } from "./ProfileProvider";
import { TitleDuo } from "./TitleDuo";
import { Loader } from "./ui";

/** Au-delà, les dos restants se résument en « + 12 autres ». */
const SLOTS = 40;
const SHOWN = 3;

/** Les parcours suivis (à voir, à posséder, ou les deux), avec leurs films. */
export function useParcours() {
  const { sb, status } = useProfile();
  const [sets, setSets] = useState<MySet[] | null>(null);
  const [items, setItemsState] = useState<SetItem[]>([]);
  useEffect(() => {
    if (!sb || status !== "ready") return;
    let alive = true;
    (async () => {
      const s = (await mySets(sb)).filter((x) => x.follows.some((f) => !f.archived_at));
      const it = await setItems(sb, s.map((x) => x.id));
      if (alive) {
        setSets(s);
        setItemsState(it);
      }
    })().catch(() => alive && setSets([]));
    return () => {
      alive = false;
    };
  }, [sb, status]);
  const rows = useMemo(() => (sets ? followedAll(sets, items) : null), [sets, items]);
  return rows;
}

/** Un parcours : son étagère (le dos prend la couleur de l'affiche : à moitié si vu ou possédé, en entier si les deux), où tu en es, et la suite. */
function ParcoursShelf({ r, lit }: { r: Parcours; lit: boolean }) {
  const { seen, owned } = useProfile();
  const st = parcoursState(r.films, seen, owned);
  const shown = r.films.slice(0, SLOTS);
  const complete = st.total > 0 && st.bothN === st.total;
  const done = r.follows.find((f) => f.completed_at);
  return (
    <div className={`rayon parcours${lit ? " lit" : ""}`} id={`parcours-${r.set.key}`}>
      <div className="rayon-head">
        <Link href={`/ensembles/${r.set.key}`} className="rayon-t">
          <TitleDuo title={r.set.title} />
        </Link>
        <span className="rayon-k">{r.set.subtitle}</span>
        <span className="rayon-nums">
          <span className="rayon-n" title="Vus">
            {st.seenN} <i>/ {st.total}</i>
          </span>
          <span className="rayon-sub">
            <Eye aria-hidden="true" /> {st.seenN > 1 ? "vus" : "vu"} · {st.ownedN} {st.ownedN > 1 ? "possédés" : "possédé"}
          </span>
        </span>
      </div>
      <div className="rayon-shelf" role="list" aria-label={`${r.set.title} : ${st.seenN} vus et ${st.ownedN} possédés sur ${st.total}`}>
        {shown.map((f) => {
          const isSeen = seen.has(f.tmdb_id);
          const mine = owned.has(f.tmdb_id);
          const title = f.films?.title ?? "Film";
          const [a, b] = splitTitle(title);
          const year = (f.release_date || f.films?.release_date || "").slice(0, 4);
          const state = `${mine ? "possédé" : "pas de disque"}, ${isSeen ? "vu" : "pas encore vu"}`;
          const fill = mine || isSeen ? (mine && isSeen ? " fill full" : " fill half") : "";
          const poster = (mine || isSeen) && f.films ? ({ "--p": `url(${img((f.films as { poster_path?: string | null }).poster_path ?? null, "w185")})` } as React.CSSProperties) : undefined;
          return (
            <Link key={f.tmdb_id} role="listitem" href={`/film/${f.tmdb_id}`} className={`rspine${mine ? "" : " ghost"}${isSeen ? " seen" : ""}${fill}`} style={poster} title={`${title} (${year}) · ${state}`} aria-label={`${title}, ${state}`}>
              <span className="t">
                {mine ? <b>{a}</b> : a}
                {b ? (mine ? <span> {b}</span> : ` ${b}`) : null}
              </span>
              {isSeen ? <Eye className="rs-eye" aria-hidden="true" /> : null}
            </Link>
          );
        })}
        {r.films.length > shown.length ? (
          <Link href={`/ensembles/${r.set.key}`} className="rayon-more">
            + {r.films.length - shown.length} autres
          </Link>
        ) : null}
      </div>
      <ul className="parcours-next">
        {st.toSee ? (
          <li>
            <span className="label">À voir ensuite</span>
            <Link href={`/film/${st.toSee.id}`}>
              <b>{st.toSee.title}</b>
            </Link>
            {st.toSee.year ? <span className="dim"> · {st.toSee.year}</span> : null}
          </li>
        ) : null}
        {st.toOwn ? (
          <li>
            <span className="label">Disque à chercher</span>
            <Link href={`/film/${st.toOwn.id}`}>
              <b>{st.toOwn.title}</b>
            </Link>
            {st.toOwn.year ? <span className="dim"> · {st.toOwn.year}</span> : null}
            {st.toOwn.known ? <span className="dim"> · tu l'as déjà vu</span> : null}
          </li>
        ) : null}
      </ul>
      {complete ? (
        <p className="rayon-done">Parcours complet : tout vu, tout possédé{done?.completed_at ? ` · ${frDate(done.completed_at.slice(0, 10), { month: "long", year: "numeric" })}` : ""}</p>
      ) : null}
    </div>
  );
}

/** Une ligne sur Découvrir : où reprendre ton parcours le plus récent. */
export function ParcoursTeaser() {
  const { seen, owned } = useProfile();
  const rows = useParcours();
  if (!rows?.length) return null;
  const top = rows.slice(0, 2);
  return (
    <section className="section teaser" aria-labelledby="teaser-title">
      <div className="sec-head">
        <h2 id="teaser-title">
          Reprendre <span>un parcours</span>
        </h2>
        <span className="aside">
          <Link href="/parcours">Tous tes parcours →</Link>
        </span>
      </div>
      <ul className="teaser-list">
        {top.map((r) => {
          const st = parcoursState(r.films, seen, owned);
          return (
            <li key={r.set.id}>
              <Link href={`/parcours?p=${r.set.key}`} className="teaser-t">
                <TitleDuo title={r.set.title} />
              </Link>
              <span className="dim">
                {st.seenN} vus sur {st.total} · {st.ownedN} {plural(st.ownedN, "possédé").replace(/^\d+\s/, "")}
              </span>
              {st.toSee ? (
                <span className="teaser-n">
                  À voir : <Link href={`/film/${st.toSee.id}`}>{st.toSee.title}</Link>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** La page Parcours : ce que tu suis (vu et possédé), où continuer, et tout le catalogue. */
export function ParcoursPage() {
  const { sb } = useProfile();
  const rows = useParcours();
  const { seen, owned } = useProfile();
  const [all, setAll] = useState(false);
  const [lit, setLit] = useState<string | null>(null);
  useEffect(() => setLit(new URLSearchParams(location.search).get("p")), []);

  // un parcours terminé est noté une seule fois (rayon : tout possédé ; cycle : tout vu)
  useEffect(() => {
    if (!sb || !rows) return;
    for (const r of rows) {
      const st = parcoursState(r.films, seen, owned);
      if (!st.total) continue;
      for (const f of r.follows) {
        const done = f.mode === "own" ? st.ownedN === st.total : st.seenN === st.total;
        if (done && !f.completed_at) markCompleted(sb, r.set.id, f.mode, st.total).catch(() => {});
      }
    }
  }, [sb, rows, seen, owned]);

  const ordered = useMemo(() => (rows && lit ? [...rows.filter((r) => r.set.key === lit), ...rows.filter((r) => r.set.key !== lit)] : rows ?? []), [rows, lit]);
  useEffect(() => {
    if (lit && ordered.length) document.getElementById(`parcours-${lit}`)?.scrollIntoView({ block: "center" });
  }, [lit, ordered.length]);

  const shown = all ? ordered : ordered.slice(0, SHOWN);
  return (
    <>
      <section className="section parcours-head">
        <p className="label">Parcours</p>
        <h1>
          Voir <span>et posséder</span>
        </h1>
        <p className="lede">
          Un parcours, c'est un ensemble de films qui comptent : la filmographie d'un cinéaste, un mouvement, un palmarès. Chaque film <b>vu</b> colore le dos à moitié, chaque disque
          <b> possédé</b> aussi ; vu <b>et</b> possédé, il est coloré en entier.
        </p>
      </section>

      {rows === null ? (
        <Loader text="Chargement de tes parcours…" />
      ) : rows.length ? (
        <section className="rayons" aria-label="Tes parcours">
          <div className="rayons-grid parcours-grid">
            {shown.map((r) => (
              <ParcoursShelf key={r.set.id} r={r} lit={r.set.key === lit} />
            ))}
          </div>
          <p className="rayon-legend" aria-hidden="true">
            <i className="lg-ghost" /> à voir, pas de disque <i className="lg-own" /> possédé <i className="lg-seen" /> vu <i className="lg-both" /> vu et possédé
          </p>
          {ordered.length > SHOWN ? (
            <button type="button" className="link-btn" onClick={() => setAll((v) => !v)}>
              {all ? "Ne montrer que les trois premiers" : `Autres parcours (${ordered.length - SHOWN})`}
            </button>
          ) : null}
        </section>
      ) : (
        <p className="note parcours-none">
          Tu ne suis encore aucun parcours. Choisis-en un ci-dessous : il te dira ce que tu as déjà vu, ce que tu as déjà sur ton étagère, et par quoi continuer.
        </p>
      )}

      <Paths enabled={rows !== null} avoidDirector={null} skip={(rows ?? []).map((r) => r.set.key)} />
      <Catalogue />
    </>
  );
}
