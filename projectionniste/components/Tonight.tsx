"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { critLabel, parseAsk, runAsk, type Crit } from "@/lib/ask";
import { localDay, seeded, shuffle, tonight, type Envie, type Idea } from "@/lib/discover";
import { useAsync } from "@/lib/hooks";
import { img } from "@/lib/tmdb";
import { useDiscoverCtx } from "./Doors";
import { Check, Plus } from "./icons";
import { useProfile } from "./ProfileProvider";
import { detail, FilmMeta } from "./Today";
import { TitleDuo } from "./TitleDuo";
import { ErrorLine, Loader } from "./ui";

/** Trois idées par envie, cinq pour une phrase : on choisit, on ne fait pas défiler. */
const MAX_ENVIE = 3;

const ENVIES: { k: Envie; l: string; end: string; link?: [string, string] }[] = [
  { k: "court", l: "Moins de 1 h 40", end: "Trois idées, c'est assez pour un soir." },
  { k: "possede", l: "Possédé, pas vu", end: "Les autres attendent sur ton étagère.", link: ["Ta collection", "/collection"] },
  { k: "watchlist", l: "Dans ma watchlist", end: "Le reste de ta watchlist t'attend.", link: ["Ta watchlist", "/journal?onglet=avoir"] },
  { k: "classique", l: "Un classique", end: "Trois idées, c'est assez pour un soir." },
];

/** Des phrases qu'on peut taper telles quelles : trois par jour, pour montrer ce qui est possible. */
const EXAMPLES = [
  "Un film dans le style de Scorsese, mafia, après 2010",
  "Un thriller coréen",
  "Une comédie des années 80",
  "Dans le style de Kubrick, science-fiction",
  "Un polar français avant 1980",
  "Un film d'espionnage, moins de 2 h",
  "Un classique japonais",
  "De Wong Kar-wai, après 1995",
  "Une histoire de vengeance, après 2000",
  "Un drame italien des années 60",
];

type Shown = { ideas: Idea[]; end: string; link?: [string, string]; own?: { id: number; title: string; year: string; name: string } | null };

function IdeaCard({ idea, n, total, onNext, end, link, own }: { idea: Idea; n: number; total: number; onNext: () => void; end: string; link?: [string, string]; own?: Shown["own"] }) {
  const d = useProfile();
  const det = useAsync(() => detail(idea.id).catch(() => null), [idea.id]);
  const m = det.data?.id === idea.id ? det.data : null;
  if (!m) return <Loader text="Un instant…" />;
  const inWl = d.watchlist.has(m.id);
  return (
    <article className="idea" aria-live="polite">
      <Link href={`/film/${m.id}`} className="idea-still" tabIndex={-1} aria-hidden="true">
        {m.backdrop_path || m.poster_path ? <img key={m.id} src={img(m.backdrop_path || m.poster_path, "w780")} alt="" /> : null}
      </Link>
      <div>
        <h3 className="idea-t">
          <Link href={`/film/${m.id}`}>
            <TitleDuo title={m.title} />
          </Link>
        </h3>
        <FilmMeta m={m} />
        <p className="idea-why">{idea.why}</p>
        <div className="idea-actions">
          <Link className="btn primary" href={`/film/${m.id}`}>
            Voir la fiche
          </Link>
          <button type="button" className="btn" aria-pressed={inWl} onClick={() => d.toggleWatchlist(m)}>
            {inWl ? <Check /> : <Plus />}
            {inWl ? "Dans ta watchlist" : "Watchlist"}
          </button>
        </div>
        <p className="idea-foot">
          {n + 1 < total ? (
            <button type="button" className="link-btn" onClick={onNext}>
              Un autre
            </button>
          ) : (
            <span>
              {end}{" "}
              {link ? (
                <Link className="link" href={link[1]}>
                  {link[0]}
                </Link>
              ) : null}
            </span>
          )}
          <span className="idea-n">
            {n + 1} / {total}
          </span>
        </p>
        {own && n + 1 >= total ? (
          <p className="idea-own">
            Pour voir un film de {own.name} lui-même :{" "}
            <Link href={`/film/${own.id}`}>
              <b>{own.title}</b>
            </Link>
            {own.year ? ` · ${own.year}` : ""}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/**
 * « Ce soir ? » : on dit ce qu'on veut (une phrase), ou on choisit une envie. Fillmography montre ce qu'il a compris
 * sous forme d'étiquettes qu'on peut retirer, puis un film à la fois.
 */
export function Tonight() {
  const d = useProfile();
  const ctx = useDiscoverCtx();
  const [text, setText] = useState("");
  const [envie, setEnvie] = useState<Envie | null>(null);
  const [crits, setCrits] = useState<Crit[] | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [shown, setShown] = useState<Shown | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [at, setAt] = useState(0);
  const run = useRef(0);

  const examples = useMemo(() => shuffle(EXAMPLES, seeded(`${localDay()}|exemples`)).slice(0, 3), []);

  const finish = (s: Shown | null, err: unknown = null) => {
    setShown(s);
    setError(err);
    setAt(0);
    setBusy(false);
  };

  const search = async (list: Crit[], unk: string[]) => {
    if (!ctx) return;
    const id = ++run.current;
    setBusy(true);
    setEnvie(null);
    setCrits(list);
    setUnknown(unk);
    if (!list.length) return finish(null);
    try {
      const r = await runAsk(list, ctx);
      if (id !== run.current) return;
      const relaxed = r.relaxed.length ? ` Sans « ${r.relaxed.join(" », « ")} » : trop peu de films le permettent.` : "";
      finish({ ideas: r.ideas.map((x, i) => (i === 0 && relaxed ? { ...x, why: x.why + relaxed } : x)), end: "Voilà ce que j'ai trouvé. Précise ou retire une étiquette pour changer.", own: r.own });
    } catch (e) {
      if (id === run.current) finish(null, e);
    }
  };

  const ask = async (phrase: string) => {
    const t = phrase.trim();
    if (!t || !ctx) return;
    const id = ++run.current;
    setBusy(true);
    setShown(null);
    setError(null);
    try {
      const p = await parseAsk(t);
      if (id !== run.current) return;
      await search(p.crits, p.unknown);
    } catch (e) {
      if (id === run.current) finish(null, e);
    }
  };

  const pickEnvie = (k: Envie) => {
    if (!ctx) return;
    if (envie === k) {
      setEnvie(null);
      return finish(null);
    }
    const id = ++run.current;
    setEnvie(k);
    setCrits(null);
    setUnknown([]);
    setBusy(true);
    setShown(null);
    const e = ENVIES.find((x) => x.k === k)!;
    tonight(k, ctx).then(
      (ideas) => id === run.current && finish({ ideas: ideas.slice(0, MAX_ENVIE), end: e.end, link: e.link }),
      (err) => id === run.current && finish(null, err),
    );
  };

  // un film vu entre-temps sort de la liste
  const list = (shown?.ideas ?? []).filter((x) => !d.seen.has(x.id));
  const total = list.length;
  const cur = Math.min(at, Math.max(total - 1, 0));
  const unseenOwned = useMemo(() => [...d.owned.keys()].filter((id) => !d.seen.has(id)).length, [d.owned, d.seen]);

  useEffect(() => {
    if (!ctx) run.current++;
  }, [ctx]);

  // une phrase venue de la barre de recherche (?envie=…) est lancée tout de suite
  const fromUrl = useRef(false);
  useEffect(() => {
    if (!ctx || fromUrl.current) return;
    const q = new URLSearchParams(location.search).get("envie");
    if (!q) return;
    fromUrl.current = true;
    history.replaceState(null, "", location.pathname);
    setText(q);
    ask(q);
    document.getElementById("tonight-title")?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);

  if (!ctx) return null;
  const envies = ENVIES.filter((e) => (e.k === "possede" ? unseenOwned > 0 : e.k === "watchlist" ? d.watchlist.size > 0 : true));

  return (
    <section className="section tonight" aria-labelledby="tonight-title">
      <div className="sec-head">
        <h2 id="tonight-title">
          Ce <span>soir ?</span>
        </h2>
        <span className="aside">Dis ce que tu veux, ou choisis une envie.</span>
      </div>

      <form
        className="ask"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <label className="sr-only" htmlFor="ask-input">
          Décris le film que tu cherches
        </label>
        <input
          id="ask-input"
          className="ask-input"
          type="text"
          value={text}
          maxLength={200}
          autoComplete="off"
          placeholder="Décris ce que tu veux voir…"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn primary" disabled={!text.trim()}>
          Chercher
        </button>
      </form>

      <div className="envies" role="group" aria-label="Une envie">
        {envies.map((e) => (
          <button key={e.k} type="button" aria-pressed={envie === e.k} onClick={() => pickEnvie(e.k)}>
            {e.l}
            {e.k === "possede" ? <i>{unseenOwned}</i> : e.k === "watchlist" ? <i>{d.watchlist.size}</i> : null}
          </button>
        ))}
      </div>
      <p className="ask-try">
        Essaie :{" "}
        {examples.map((x, i) => (
          <span key={x}>
            {i ? " · " : ""}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setText(x);
                ask(x);
              }}
            >
              {x}
            </button>
          </span>
        ))}
      </p>

      {crits ? (
        <div className="ask-got" aria-live="polite">
          {crits.length ? (
            <>
              <span className="label">J'ai compris</span>
              {crits.map((c, i) => (
                <button
                  key={`${c.k}${i}`}
                  type="button"
                  className="tag"
                  aria-label={`Retirer : ${critLabel(c)}`}
                  onClick={() => search(crits.filter((_, j) => j !== i), unknown)}
                >
                  {critLabel(c)} <span aria-hidden="true">×</span>
                </button>
              ))}
            </>
          ) : null}
          {unknown.length ? <span className="ask-unk">Pas compris : « {unknown.join(" », « ")} »</span> : null}
        </div>
      ) : null}

      {busy ? (
        <Loader text="Je cherche…" />
      ) : error ? (
        <ErrorLine error={error} />
      ) : crits && !crits.length ? (
        <p className="note idea-none">
          Je n'ai pas reconnu de critère. Essaie un genre (thriller, comédie), une époque (années 80, après 2010), un pays (coréen, italien), un thème (mafia, vengeance) ou un
          cinéaste (« dans le style de Kubrick »).
        </p>
      ) : shown && !total ? (
        <p className="note idea-none">Rien ne correspond à tous ces critères. Retire une étiquette pour élargir.</p>
      ) : shown ? (
        <IdeaCard idea={list[cur]} n={cur} total={total} end={shown.end} link={shown.link} own={shown.own} onNext={() => setAt((x) => x + 1)} />
      ) : null}
    </section>
  );
}
