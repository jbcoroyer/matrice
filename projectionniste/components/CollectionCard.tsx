"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { conditionLabel, formatCode, formatLabel, packagingLabel, photoUrl, sealText, type CollectionItem, type Entry } from "@/lib/collection";
import { entriesForFilm, type DiaryEntry } from "@/lib/diary";
import { frDate, num1, splitTitle } from "@/lib/format";
import { GENRE_FR } from "@/lib/genres";
import { img } from "@/lib/tmdb";
import { Eye, EyeOff } from "./icons";
import { useProfile } from "./ProfileProvider";

const year = (e: Entry) => (e.film.release_date || "").slice(0, 4);

/** Ligne de type d'une carte : genre · réalisateur · année (comme « Créature — Elfe » sur une carte à jouer). */
function typeLine(e: Entry) {
  const genre = e.film.genre_ids.map((g) => GENRE_FR[g]).find(Boolean);
  return [genre, e.best.director || e.copies.find((c) => c.director)?.director, year(e)].filter(Boolean).join(" · ");
}

const loanDays = (c: CollectionItem) => (c.lent_on ? Math.max(0, Math.round((Date.now() - +new Date(c.lent_on + "T12:00:00")) / 86400000)) : null);

/**
 * Carte de collection : l'affiche entière dans un cadre dont la matière dit ce qu'est l'exemplaire
 * (noir mat, argent satiné, or crème). L'affiche retourne la carte ; le titre ouvre la fiche du film.
 * `seen` absent (page publique) : pas de médaillon de note.
 */
export function CollectionCard({
  entry,
  seen,
  rating,
  onEdit,
  lit,
  still,
}: {
  entry: Entry;
  seen?: boolean;
  rating?: number | null;
  onEdit?: (item: CollectionItem) => void;
  /** reflet visible en permanence (captures) */
  lit?: boolean;
  /** carte posée (feuille de consultation) : pas de retournement, le détail est à côté */
  still?: boolean;
}) {
  const { sb, userId } = useProfile();
  const [flipped, setFlipped] = useState(false);
  const [visits, setVisits] = useState<DiaryEntry[] | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const best = entry.best;
  const [a, b] = splitTitle(entry.film.title);
  const loaned = entry.copies.find((c) => c.lent_to);
  const sealed = entry.copies.some((c) => c.sealed) && !loaned;
  const seal = sealText(best);

  // le verso raconte aussi les visionnages : on ne les charge qu'au premier retournement
  useEffect(() => {
    if (flipped && seen && visits === null && sb && userId) entriesForFilm(sb, userId, entry.tmdb_id).then(setVisits, () => setVisits([]));
  }, [flipped, seen, visits, sb, userId, entry.tmdb_id]);

  const tilt = (ev: React.PointerEvent) => {
    if (ev.pointerType !== "mouse" || !root.current) return;
    const r = root.current.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width;
    const y = (ev.clientY - r.top) / r.height;
    const s = root.current.style;
    s.setProperty("--ry", `${((x - 0.5) * 14).toFixed(1)}deg`);
    s.setProperty("--rx", `${((0.5 - y) * 10).toFixed(1)}deg`);
    s.setProperty("--mx", `${(x * 100).toFixed(0)}%`);
  };
  const untilt = () => {
    root.current?.style.removeProperty("--ry");
    root.current?.style.removeProperty("--rx");
  };

  const rate =
    seen === undefined ? null : seen ? (
      <span className="tcg-rate" title={rating ? `Vu, ta note : ${num1(rating)}` : "Vu"}>
        {rating ? num1(rating) : <Eye />}
      </span>
    ) : (
      <span className="tcg-rate un" title="Jamais vu">
        <EyeOff />
      </span>
    );

  const last = visits && visits.length ? visits.map((v) => v.watched_on).filter(Boolean).sort().at(-1) : null;

  return (
    <div ref={root} className={`tcg f-${entry.finish}${flipped ? " flipped" : ""}${lit ? " lit" : ""}`} onPointerMove={tilt} onPointerLeave={untilt}>
      <div className="tcg-tilt">
        <div className="tcg-flip">
          <article className="tcg-face front" inert={flipped} aria-label={`Carte : ${entry.film.title}`}>
            <div className="tcg-in">
              <button
                type="button"
                className={`tcg-art${loaned ? " loaned" : ""}`}
                onClick={() => !still && setFlipped(true)}
                tabIndex={still ? -1 : undefined}
                aria-label={still ? entry.film.title : `Retourner la carte de ${entry.film.title}`}
              >
                {entry.film.poster_path ? <img src={img(entry.film.poster_path, "w342")} alt="" loading="lazy" /> : <span className="noimg">{entry.film.title}</span>}
                {sealed ? <span className="seal" /> : null}
                <span className="tcg-medal">{formatCode(best.format)}</span>
                {seal ? <span className="tcg-fin">{seal}</span> : null}
                {loaned ? (
                  <span className="tcg-tag">Prêté à {loaned.lent_to}</span>
                ) : sealed ? (
                  <span className="tcg-tag">Scellé</span>
                ) : null}
                {entry.copies.length > 1 ? <span className="tcg-copies">{entry.copies.length} exemplaires</span> : null}
              </button>
              <div className="tcg-plate">
                <Link href={`/film/${entry.tmdb_id}`} className="tcg-title" title={entry.film.title}>
                  <b>{a}</b>
                  {b ? <span> {b}</span> : null}
                </Link>
                <div className="tcg-type">{typeLine(entry)}</div>
                <div className="tcg-foot">
                  <span className="tcg-no">
                    {formatLabel(best.format)}
                    {entry.copies.length > 1 ? <i> +{entry.copies.length - 1}</i> : null}
                  </span>
                  {rate}
                </div>
              </div>
            </div>
          </article>

          <article className="tcg-face back" inert={!flipped} aria-label={`Fiche de l'exemplaire : ${entry.film.title}`}>
            <div className="tcg-in">
              <div className="tcg-back-head">
                <span className="label">{entry.copies.length > 1 ? `${entry.copies.length} exemplaires` : "Exemplaire"}</span>
                <button type="button" className="tcg-flipback" onClick={() => setFlipped(false)} aria-label="Retourner la carte">
                  ↺
                </button>
              </div>
              <h4>
                <b>{a}</b>
                {b ? <span> {b}</span> : null}
              </h4>
              {entry.copies.map((c) => {
                const photo = sb ? photoUrl(sb, c.photo_path) : null;
                const days = loanDays(c);
                return (
                  <div key={c.id} className="tcg-copy">
                    <div className="tkv">
                      <span className="tk">Format</span>
                      <span className="tv">
                        <b>{formatLabel(c.format)}</b>
                        {packagingLabel(c.packaging) ? ` · ${packagingLabel(c.packaging)}` : ""}
                        {c.edition ? ` · ${c.edition}` : ""}
                      </span>
                    </div>
                    {c.publisher ? (
                      <div className="tkv">
                        <span className="tk">Éditeur</span>
                        <span className="tv">{c.publisher}</span>
                      </div>
                    ) : null}
                    {c.edition_no ? (
                      <div className="tkv">
                        <span className="tk">Numérotée</span>
                        <span className="tv">
                          {String(c.edition_no).padStart(4, "0")}
                          {c.edition_of ? ` / ${c.edition_of}` : ""}
                        </span>
                      </div>
                    ) : null}
                    {c.condition || c.sealed ? (
                      <div className="tkv">
                        <span className="tk">État</span>
                        <span className="tv">{[conditionLabel(c.condition), c.sealed ? "sous blister" : ""].filter(Boolean).join(", ")}</span>
                      </div>
                    ) : null}
                    {c.acquired_on ? (
                      <div className="tkv">
                        <span className="tk">Acquis le</span>
                        <span className="tv">{frDate(c.acquired_on)}</span>
                      </div>
                    ) : null}
                    {c.lent_to ? (
                      <div className="tkv">
                        <span className="tk">Prêté à</span>
                        <span className="tv">
                          {c.lent_to}
                          {days != null ? ` · depuis ${days} j` : ""}
                        </span>
                      </div>
                    ) : null}
                    {c.notes ? (
                      <div className="tkv">
                        <span className="tk">Notes</span>
                        <span className="tv">{c.notes}</span>
                      </div>
                    ) : null}
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="tcg-photo" src={photo} alt={`Ton exemplaire de ${entry.film.title}`} loading="lazy" />
                    ) : null}
                    {onEdit ? (
                      <button type="button" className="tcg-edit" onClick={() => onEdit(c)}>
                        Modifier{entry.copies.length > 1 ? ` (${formatLabel(c.format)})` : ""}
                      </button>
                    ) : null}
                  </div>
                );
              })}
              <span className="tcg-sp" />
              {seen ? (
                <div className="tcg-seen">
                  {visits === null ? (
                    "Vu"
                  ) : visits.length ? (
                    <>
                      <b>{visits.length === 1 ? "Vu 1 fois" : `Vu ${visits.length} fois`}</b>
                      {last ? ` · dernière séance le ${frDate(last)}` : ""}
                    </>
                  ) : (
                    <b>Vu</b>
                  )}
                  {rating ? ` · ta note ${num1(rating)}` : ""}
                </div>
              ) : seen === false ? (
                <div className="tcg-seen">Jamais vu.</div>
              ) : null}
              <Link href={`/film/${entry.tmdb_id}`} className="tcg-open">
                Ouvrir la fiche du film →
              </Link>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

/**
 * Dos de boîtier pour la vue Étagère. Il est possédé (il est sur l'étagère) : la couleur de l'affiche monte
 * jusqu'à mi-hauteur ; vu en plus, elle remplit tout le dos, avec un petit œil. Même logique que les rayons.
 */
export function Spine({ entry, copy, seen, onOpen }: { entry: Entry; copy: CollectionItem; seen?: boolean; onOpen?: () => void }) {
  const [a, b] = splitTitle(entry.film.title);
  // une seule étagère pour tous les formats : même dos, même taille, on ne fait pas de différence
  if (copy.lent_to) {
    return (
      <span className="slot">
        <button type="button" className="spine loan" title={`${entry.film.title} est prêté à ${copy.lent_to}`} onClick={onOpen} disabled={!onOpen}>
          <span className="t">Prêté à {copy.lent_to}</span>
        </button>
      </span>
    );
  }
  const label = [`${entry.film.title} (${year(entry)})`, formatLabel(copy.format), packagingLabel(copy.packaging), copy.edition, seen ? "vu" : "pas encore vu"].filter(Boolean).join(" · ");
  const poster = entry.film.poster_path ? ({ "--p": `url(${img(entry.film.poster_path, "w185")})` } as React.CSSProperties) : undefined;
  const cls = `spine fill ${seen ? "full seen" : "half"}`;
  const inner = (
    <>
      <span className="t">
        <b>{a}</b>
        {b ? <span> {b}</span> : null}
      </span>
      <span className="y">{year(entry).slice(2)}</span>
      {seen ? <Eye className="rs-eye" aria-hidden="true" /> : null}
    </>
  );
  if (onOpen)
    return (
      <span className="slot">
        <button type="button" className={cls} style={poster} title={label} aria-label={label} onClick={onOpen}>
          {inner}
        </button>
      </span>
    );
  return (
    <span className="slot">
      <Link href={`/film/${entry.tmdb_id}`} className={cls} style={poster} title={label}>
        {inner}
      </Link>
    </span>
  );
}
