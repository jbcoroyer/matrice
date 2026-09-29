"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { StarsText } from "@/components/Stars";
import { ErrorLine, Loader, ProfileGate } from "@/components/ui";
import { filmFacts, people, summarize, yearEntries, type Facts, type YearEntry } from "@/lib/bilan";
import { diaryIndex } from "@/lib/diary";
import { frDate, num1 } from "@/lib/format";
import { GENRE_FR } from "@/lib/genres";
import { img } from "@/lib/tmdb";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const n = (x: number) => x.toLocaleString("fr-FR");
const pl = (x: number, one: string, many = one + "s") => `${n(x)} ${x > 1 ? many : one}`;

/** Histogramme vertical à une seule série : valeur du pic affichée, les autres au survol. */
function Columns({ values, labels, full, unit, caption }: { values: number[]; labels: string[]; full: string[]; unit: [string, string]; caption: string }) {
  const max = Math.max(1, ...values);
  const peak = values.indexOf(Math.max(...values));
  return (
    <figure className="cols-fig">
      <div className="cols" role="img" aria-label={caption}>
        {values.map((v, i) => (
          <div key={i} className="col" tabIndex={0} aria-label={`${full[i]} : ${pl(v, ...unit)}`}>
            <span className="tip" aria-hidden>
              {full[i]} · <b>{pl(v, ...unit)}</b>
            </span>
            <span className="val" aria-hidden>
              {i === peak && v ? n(v) : ""}
            </span>
            <span className="bar" style={{ height: `calc((100% - 18px) * ${v / max})` }} />
            <span className="lab" aria-hidden>
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {values.map((v, i) => (
            <tr key={i}>
              <th scope="row">{full[i]}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Barres horizontales classées (genres, décennies, personnes). */
function Ranking({ rows, unit }: { rows: { key: string | number; label: React.ReactNode; n: number }[]; unit: [string, string] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ol className="hbars">
      {rows.map((r) => (
        <li key={r.key} title={`${pl(r.n, ...unit)}`}>
          <span className="lab">{r.label}</span>
          <span className="track">
            <span className="bar" style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
          <span className="num">{n(r.n)}</span>
        </li>
      ))}
    </ol>
  );
}

function Film({ e, note }: { e: YearEntry; note?: React.ReactNode }) {
  return (
    <Link href={`/film/${e.tmdb_id}`} className="moment-film">
      <span className="thumb">{e.films?.poster_path ? <img src={img(e.films.poster_path, "w92")} alt="" loading="lazy" /> : null}</span>
      <span>
        <b>{e.films?.title}</b>
        {note ? <span className="dim"> {note}</span> : null}
      </span>
    </Link>
  );
}

function Bilan() {
  const { sb, userId } = useProfile();
  const [years, setYears] = useState<[number, number][] | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [entries, setEntries] = useState<YearEntry[] | null>(null);
  const [facts, setFacts] = useState<Map<number, Facts> | null>(null);
  const [progress, setProgress] = useState<[number, number]>([0, 0]);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!sb || !userId) return;
    diaryIndex(sb, userId).then((i) => {
      setYears(i.years);
      const asked = +new URLSearchParams(location.search).get("annee")!;
      setYear(i.years.some(([y]) => y === asked) ? asked : (i.years[0]?.[0] ?? new Date().getFullYear()));
    }, setError);
  }, [sb, userId]);

  useEffect(() => {
    if (!sb || !userId || !year) return;
    let live = true;
    setEntries(null);
    setFacts(null);
    history.replaceState(null, "", `/bilan?annee=${year}`);
    yearEntries(sb, userId, year).then((l) => {
      if (!live) return;
      setEntries(l);
      filmFacts([...new Set(l.map((e) => e.tmdb_id))], (d, t) => live && setProgress([d, t])).then((f) => live && setFacts(f));
    }, setError);
    return () => {
      live = false;
    };
  }, [sb, userId, year]);

  const s = useMemo(() => (entries ? summarize(entries) : null), [entries]);
  const p = useMemo(() => (entries && facts ? people(entries, facts) : null), [entries, facts]);

  if (error) return <ErrorLine error={error} />;
  if (!years || !year) return <Loader text="Chargement du journal…" />;
  if (!years.length)
    return (
      <section className="section">
        <h1>Bilan de l'année</h1>
        <p className="lede">
          Le bilan se construit à partir de ton <Link href="/journal">journal</Link> : enregistre tes visionnages avec leur date, ou importe ton
          Letterboxd.
        </p>
      </section>
    );

  const idx = years.findIndex(([y]) => y === year);
  const prev = years[idx + 1]?.[0];
  const next = years[idx - 1]?.[0];
  const before = years.find(([y]) => y === year - 1)?.[1];

  return (
    <section className="section bilan">
      <div className="page-head">
        <h1>Ton année {year}</h1>
        <div className="year-nav">
          <button type="button" className="btn ghost" disabled={!prev} onClick={() => prev && setYear(prev)} aria-label="Année précédente">
            ←
          </button>
          <select value={year} onChange={(e) => setYear(+e.target.value)} aria-label="Année">
            {years.map(([y]) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="button" className="btn ghost" disabled={!next} onClick={() => next && setYear(next)} aria-label="Année suivante">
            →
          </button>
        </div>
      </div>

      {!s ? (
        <Loader text="Calcul du bilan…" />
      ) : !s.total ? (
        <p className="status">Aucun visionnage daté en {year}.</p>
      ) : (
        <>
          <dl className="tiles">
            <div>
              <dt>Visionnages</dt>
              <dd>{n(s.total)}</dd>
              {before ? (
                <small>
                  {s.total >= before ? "+" : "−"}
                  {Math.abs(Math.round(((s.total - before) / before) * 100))} % par rapport à {year - 1}
                </small>
              ) : null}
            </div>
            <div>
              <dt>Films différents</dt>
              <dd>{n(s.films)}</dd>
              {s.rewatches ? <small>{pl(s.rewatches, "revisionnage")}</small> : null}
            </div>
            <div>
              <dt>Heures devant l'écran</dt>
              <dd>{p ? n(Math.round(p.minutes / 60)) : "…"}</dd>
              {p && p.known < s.total ? <small>durée connue pour {pl(p.known, "visionnage")}</small> : null}
            </div>
            <div>
              <dt>Note moyenne</dt>
              <dd>{s.avg ? num1(s.avg) : "—"}</dd>
              {s.liked ? <small>{pl(s.liked, "film aimé", "films aimés")}</small> : null}
            </div>
            <div>
              <dt>Critiques</dt>
              <dd>{n(s.reviews)}</dd>
            </div>
          </dl>

          <div className="bilan-grid">
            <section>
              <h2>Au fil des mois</h2>
              <Columns
                values={s.months}
                labels={MONTHS.map((m) => m.slice(0, 1).toUpperCase())}
                full={MONTHS_LONG.map((m) => `${m} ${year}`)}
                unit={["visionnage", "visionnages"]}
                caption={`Visionnages par mois en ${year}`}
              />
            </section>
            <section>
              <h2>Tes notes</h2>
              {s.ratings.some((r) => r.n) ? (
                <Columns
                  values={s.ratings.map((r) => r.n)}
                  labels={s.ratings.map((r) => (r.v % 1 ? "½" : String(r.v)))}
                  full={s.ratings.map((r) => `${num1(r.v)} étoile${r.v > 1 ? "s" : ""}`)}
                  unit={["film", "films"]}
                  caption={`Répartition des notes en ${year}`}
                />
              ) : (
                <p className="note">Aucune note cette année.</p>
              )}
            </section>
          </div>

          {s.best.length ? (
            <section className="section">
              <h2>Tes meilleurs films de {year}</h2>
              <ol className="best">
                {s.best.map((e, i) => (
                  <li key={e.tmdb_id}>
                    <Link href={`/film/${e.tmdb_id}`}>
                      <span className="poster">
                        {e.films?.poster_path ? <img src={img(e.films.poster_path, "w185")} alt="" loading="lazy" /> : <span className="noimg">{e.films?.title}</span>}
                        <span className="rank">{i + 1}</span>
                      </span>
                      <span className="t">{e.films?.title}</span>
                    </Link>
                    <span className="dim">
                      <StarsText value={e.rating} />
                      {e.liked ? " ♥" : ""}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <div className="bilan-grid">
            <section>
              <h2>Genres</h2>
              <Ranking rows={s.genres.slice(0, 8).map(([g, c]) => ({ key: g, label: GENRE_FR[g] ?? "Autre", n: c }))} unit={["film", "films"]} />
            </section>
            <section>
              <h2>Époques</h2>
              <Ranking
                rows={s.decades
                  .slice(0, 8)
                  .sort((a, b) => b[0] - a[0])
                  .map(([d, c]) => ({ key: d, label: `Années ${d}`, n: c }))}
                unit={["film", "films"]}
              />
            </section>
            <section>
              <h2>Cinéastes les plus vus</h2>
              {!p ? (
                <p className="note">
                  Chargement des fiches… {progress[1] ? `${progress[0]} / ${progress[1]}` : ""}
                </p>
              ) : p.directors.length ? (
                <Ranking rows={p.directors.map((d) => ({ key: d.id, label: <Link href={`/personne/${d.id}`}>{d.name}</Link>, n: d.n }))} unit={["film", "films"]} />
              ) : (
                <p className="note">Aucun cinéaste vu deux fois cette année.</p>
              )}
            </section>
            <section>
              <h2>Acteurs et actrices les plus vus</h2>
              {!p ? (
                <p className="note">Chargement des fiches…</p>
              ) : p.actors.length ? (
                <Ranking rows={p.actors.map((d) => ({ key: d.id, label: <Link href={`/personne/${d.id}`}>{d.name}</Link>, n: d.n }))} unit={["film", "films"]} />
              ) : (
                <p className="note">Personne n'apparaît deux fois cette année.</p>
              )}
            </section>
          </div>

          <section className="section">
            <h2>Moments</h2>
            <ul className="moments">
              <li>
                <span className="k">Premier film de l'année</span>
                <Film e={s.first} note={`· ${frDate(s.first.watched_on, { day: "numeric", month: "long" })}`} />
              </li>
              {s.last.id !== s.first.id ? (
                <li>
                  <span className="k">Dernier en date</span>
                  <Film e={s.last} note={`· ${frDate(s.last.watched_on, { day: "numeric", month: "long" })}`} />
                </li>
              ) : null}
              {s.mostSeen ? (
                <li>
                  <span className="k">Le plus revu</span>
                  <Film e={s.mostSeen.e} note={`· ${s.mostSeen.n} fois`} />
                </li>
              ) : null}
              {s.busiest ? (
                <li>
                  <span className="k">Journée la plus chargée</span>
                  <span>
                    {frDate(s.busiest.day, { weekday: "long", day: "numeric", month: "long" })} · {pl(s.busiest.n, "film")}
                  </span>
                </li>
              ) : null}
              {s.streak ? (
                <li>
                  <span className="k">Plus longue série</span>
                  <span>
                    {s.streak.len} jours d'affilée, du {frDate(s.streak.from, { day: "numeric", month: "long" })} au{" "}
                    {frDate(s.streak.to, { day: "numeric", month: "long" })}
                  </span>
                </li>
              ) : null}
            </ul>
          </section>

          {s.tags.length ? (
            <section className="section">
              <h2>Tes étiquettes</h2>
              <p className="tags-line">
                {s.tags.map(([t, c]) => (
                  <Link key={t} className="chip" href={`/journal?etiquette=${encodeURIComponent(t)}&annee=${year}`}>
                    {t} · {c}
                  </Link>
                ))}
              </p>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}

export default function Page() {
  return (
    <ProfileGate>
      <Bilan />
    </ProfileGate>
  );
}
