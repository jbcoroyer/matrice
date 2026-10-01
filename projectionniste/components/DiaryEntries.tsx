"use client";

import Link from "next/link";
import { useState } from "react";
import type { DiaryEntry } from "@/lib/diary";
import { frDate } from "@/lib/format";
import { img } from "@/lib/tmdb";
import { LogDialog } from "./LogDialog";
import type { FilmInput } from "./ProfileProvider";
import { StarsText } from "./Stars";

/** Texte d'une critique : masqué s'il contient des spoilers, replié s'il est long (sauf `full`). */
export function ReviewText({ text, spoilers, full }: { text: string; spoilers: boolean; full?: boolean }) {
  const [shown, setShown] = useState(!spoilers);
  const [open, setOpen] = useState(!!full);
  if (!shown)
    return (
      <p className="review hidden-spoiler">
        Cette critique contient des spoilers.{" "}
        <button type="button" className="link-btn" onClick={() => setShown(true)}>
          La lire quand même
        </button>
      </p>
    );
  const long = text.length > 420;
  return (
    <div className="review">
      <p>{long && !open ? text.slice(0, 400).replace(/\s+\S*$/, "") + "…" : text}</p>
      {long && !full ? (
        <button type="button" className="link-btn" onClick={() => setOpen((o) => !o)}>
          {open ? "Réduire" : "Lire la suite"}
        </button>
      ) : null}
    </div>
  );
}

/** Une entrée du journal. `withFilm` affiche l'affiche et le titre (page Journal). */
export function DiaryRow({
  e,
  withFilm,
  onEdit,
  onTag,
}: {
  e: DiaryEntry;
  withFilm?: boolean;
  onEdit: (e: DiaryEntry) => void;
  onTag?: (t: string) => void;
}) {
  const f = e.films;
  return (
    <li className={`diary-row${withFilm ? "" : " compact"}`}>
      <span className="day">
        {e.watched_on ? (withFilm ? +e.watched_on.slice(8, 10) : frDate(e.watched_on, { day: "numeric", month: "short", year: "numeric" })) : "—"}
      </span>
      {withFilm ? (
        <Link href={`/film/${e.tmdb_id}`} className="thumb" aria-label={f?.title ?? `Film ${e.tmdb_id}`} tabIndex={-1}>
          {f?.poster_path ? <img src={img(f.poster_path, "w92")} alt="" loading="lazy" /> : null}
        </Link>
      ) : null}
      <div className="body">
        <div className="line">
          {withFilm ? (
            <Link href={`/film/${e.tmdb_id}`} className="t">
              {f?.title ?? `Film ${e.tmdb_id}`}
            </Link>
          ) : null}
          {withFilm && f?.release_date ? <span className="y">{f.release_date.slice(0, 4)}</span> : null}
          <StarsText value={e.rating} />
          {e.liked ? <span className="like" title="Coup de cœur" aria-label="Coup de cœur">♥</span> : null}
          {e.rewatch ? <span className="dim" title="Revisionnage">↻ revu</span> : null}
          {e.tags.map((t) =>
            onTag ? (
              <button key={t} type="button" className="chip" onClick={() => onTag(t)}>
                {t}
              </button>
            ) : (
              <span key={t} className="chip">
                {t}
              </span>
            ),
          )}
          <button type="button" className="link-btn edit" onClick={() => onEdit(e)}>
            Modifier
          </button>
        </div>
        {e.review ? <ReviewText text={e.review} spoilers={e.spoilers} /> : null}
      </div>
    </li>
  );
}

/** Liste d'entrées + fenêtre d'édition. */
export function DiaryList({
  entries,
  withFilm,
  onChange,
  onTag,
}: {
  entries: DiaryEntry[];
  withFilm?: boolean;
  onChange: () => void;
  onTag?: (t: string) => void;
}) {
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const film = (e: DiaryEntry): FilmInput => ({
    id: e.tmdb_id,
    title: e.films?.title ?? `Film ${e.tmdb_id}`,
    release_date: e.films?.release_date ?? undefined,
    poster_path: e.films?.poster_path,
  });
  return (
    <>
      <ul className="diary">
        {entries.map((e) => (
          <DiaryRow key={e.id} e={e} withFilm={withFilm} onEdit={setEditing} onTag={onTag} />
        ))}
      </ul>
      {editing ? <LogDialog film={film(editing)} entry={editing} onClose={() => setEditing(null)} onSaved={onChange} /> : null}
    </>
  );
}
