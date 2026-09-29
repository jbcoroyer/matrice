"use client";

import { useEffect, useId, useRef, useState } from "react";
import { filmRow } from "@/lib/db";
import { deleteEntry, diaryIndex, entriesForFilm, saveEntry, type DiaryEntry } from "@/lib/diary";
import { today } from "@/lib/format";
import { useProfile, type FilmInput } from "./ProfileProvider";
import { Stars } from "./Stars";

let tagCache: string[] | null = null;

/** Enregistrer (ou modifier) un visionnage : date, note, revisionnage, j'aime, critique, étiquettes. */
export function LogDialog({
  film,
  entry,
  onClose,
  onSaved,
}: {
  film: FilmInput;
  entry?: DiaryEntry;
  onClose: () => void;
  onSaved?: (e: DiaryEntry | null) => void;
}) {
  const { sb, userId, seen, rated, favorites, setFilmState, toast } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(entry ? entry.watched_on || "" : today());
  const [rating, setRating] = useState<number>(entry ? entry.rating || 0 : rated.get(film.id) || 0);
  const [rewatch, setRewatch] = useState(entry ? entry.rewatch : false);
  const [liked, setLiked] = useState(entry ? entry.liked : favorites.has(film.id));
  const [review, setReview] = useState(entry?.review || "");
  const [spoilers, setSpoilers] = useState(entry?.spoilers || false);
  const [reviewPublic, setReviewPublic] = useState(entry ? entry.review_public : true);
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [known, setKnown] = useState<string[]>(tagCache || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();

  useEffect(() => {
    ref.current?.showModal();
    // revisionnage pré-coché seulement si ce film a déjà une entrée dans le journal
    if (!entry && sb && userId && seen.has(film.id))
      entriesForFilm(sb, userId!, film.id)
        .then((l) => l.length && setRewatch(true))
        .catch(() => {});
    if (!tagCache && sb && userId)
      diaryIndex(sb, userId)
        .then((i) => setKnown((tagCache = i.tags.map(([t]) => t))))
        .catch(() => {});
  }, [sb]);

  const addTag = (raw: string) => {
    const parts = raw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length) setTags((t) => [...new Set([...t, ...parts])]);
    setTagDraft("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb || !userId) return;
    setBusy(true);
    setError(null);
    const allTags = tagDraft.trim() ? [...new Set([...tags, ...tagDraft.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)])] : tags;
    try {
      const saved = await saveEntry(
        sb,
        userId,
        filmRow(film),
        { watched_on: date || null, rating: rating || null, rewatch, liked, review: review || null, spoilers: !!review && spoilers, review_public: reviewPublic, tags: allTags },
        entry?.id,
      );
      tagCache = [...new Set([...(tagCache || []), ...allTags])];
      // l'état du film suit le journal : vu, dernière note, favori si « j'aime »
      const patch: Parameters<typeof setFilmState>[1] = { watched: true, watchlist: false };
      // la note du film est celle du dernier visionnage : on ne l'écrase pas en retouchant une vieille entrée
      if (rating && !entry) patch.rating = rating;
      if (liked) patch.favorite = true;
      setFilmState(film, patch);
      toast(entry ? "Entrée du journal modifiée" : `« ${film.title} » ajouté à ton journal`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!sb || !entry || !confirm("Supprimer cette entrée du journal ?")) return;
    setBusy(true);
    try {
      await deleteEntry(sb, entry.id);
      toast("Entrée supprimée");
      onSaved?.(null);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <form onSubmit={save}>
        <h2>
          {entry ? "Modifier le visionnage" : "J'ai vu…"} <span className="dim">{film.title}</span>
        </h2>
        <div className="form-row">
          <label>
            Date
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} /> Revisionnage
          </label>
          <label className="check">
            <input type="checkbox" checked={liked} onChange={(e) => setLiked(e.target.checked)} /> J'aime
          </label>
        </div>
        <div className="form-row">
          <span>Note</span>
          <Stars value={rating} onChange={setRating} />
          {rating ? (
            <button type="button" className="link-btn" onClick={() => setRating(0)}>
              effacer
            </button>
          ) : null}
        </div>
        <label className="block">
          Critique
          <textarea rows={6} value={review} maxLength={20000} placeholder="Facultatif" onChange={(e) => setReview(e.target.value)} />
        </label>
        {review.trim() ? (
          <div className="form-row">
            <label className="check">
              <input type="checkbox" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} /> Contient des spoilers
            </label>
            <label className="check">
              <input type="checkbox" checked={!reviewPublic} onChange={(e) => setReviewPublic(!e.target.checked)} /> Critique privée{" "}
              <span className="dim">(sinon visible de tous sur la fiche du film)</span>
            </label>
          </div>
        ) : null}
        <div className="block">
          <label htmlFor={`${listId}-t`}>Étiquettes</label>
          <div className="tags-input">
            {tags.map((t) => (
              <button key={t} type="button" className="chip" title="Retirer" onClick={() => setTags((x) => x.filter((y) => y !== t))}>
                {t} ×
              </button>
            ))}
            <input
              id={`${listId}-t`}
              list={listId}
              value={tagDraft}
              placeholder={tags.length ? "" : "cinéma, avec marie…"}
              onChange={(e) => (e.target.value.endsWith(",") ? addTag(e.target.value) : setTagDraft(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagDraft.trim()) {
                  e.preventDefault();
                  addTag(tagDraft);
                } else if (e.key === "Backspace" && !tagDraft && tags.length) setTags((x) => x.slice(0, -1));
              }}
            />
            <datalist id={listId}>
              {known.filter((t) => !tags.includes(t)).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>
        {error ? <p className="status err">{error}</p> : null}
        <div className="dialog-actions">
          {entry ? (
            <button type="button" className="btn ghost danger" disabled={busy} onClick={remove}>
              Supprimer
            </button>
          ) : null}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
