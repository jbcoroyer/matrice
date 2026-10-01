"use client";

import { errorText } from "@/lib/errors";
import { useEffect, useRef, useState } from "react";
import { CONDITIONS, deleteItem, fetchExtra, FORMATS, PACKAGINGS, photoUrl, PUBLISHERS, removePhoto, restoreItem, saveItem, uploadPhoto, type CollectionItem, type Format, type Packaging } from "@/lib/collection";
import { filmRow } from "@/lib/db";
import { today } from "@/lib/format";
import { useProfile, type FilmInput } from "./ProfileProvider";

const LAST_FORMAT = "projo.lastFormat";
const lastFormat = (): Format => {
  try {
    const f = localStorage.getItem(LAST_FORMAT);
    return FORMATS.some((x) => x.k === f) ? (f as Format) : "bluray";
  } catch {
    return "bluray";
  }
};

/** Ajouter ou modifier un exemplaire : format, édition, éditeur, numéro, scellé, état, prêt, photo, notes. */
export function CopyDialog({
  film,
  item,
  onClose,
  onSaved,
  onNext,
}: {
  film: FilmInput;
  item?: CollectionItem;
  onClose: () => void;
  onSaved: () => void;
  /** ajout en série : « Enregistrer et en ajouter un autre » */
  onNext?: () => void;
}) {
  const { sb, userId, toast, refreshOwned, parcoursNote } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<Format>(item?.format ?? lastFormat());
  const [packaging, setPackaging] = useState<Packaging>(item?.packaging ?? "standard");
  const [edition, setEdition] = useState(item?.edition ?? "");
  const [publisher, setPublisher] = useState(item?.publisher ?? "");
  const [editionNo, setEditionNo] = useState(item?.edition_no ? String(item.edition_no) : "");
  const [editionOf, setEditionOf] = useState(item?.edition_of ? String(item.edition_of) : "");
  const [sealed, setSealed] = useState(item?.sealed ?? false);
  const [condition, setCondition] = useState(item?.condition ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [acquired, setAcquired] = useState(item?.acquired_on ?? "");
  const [lentTo, setLentTo] = useState(item?.lent_to ?? "");
  const [lentOn, setLentOn] = useState(item?.lent_on ?? "");
  const [photo, setPhoto] = useState<string | null>(item?.photo_path ?? null);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [more, setMore] = useState(!!(item && (item.edition_no || item.condition || item.notes || item.acquired_on || item.lent_to || item.photo_path)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => ref.current?.showModal(), []);
  useEffect(() => {
    if (!newPhoto) return setPreview(null);
    const u = URL.createObjectURL(newPhoto);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [newPhoto]);

  const shownPhoto = preview ?? (sb ? photoUrl(sb, photo) : null);

  const save = async (next: boolean) => {
    if (!sb || !userId) return;
    setBusy(true);
    setError(null);
    try {
      let photoPath = photo;
      if (newPhoto) photoPath = await uploadPhoto(sb, userId, newPhoto);
      // le réalisateur et la saga servent à la ligne de type de la carte et aux séries : on les range avec l'exemplaire
      const extra = item ? null : await fetchExtra(film.id).catch(() => null);
      await saveItem(
        sb,
        userId,
        filmRow(film),
        {
          format,
          packaging,
          edition,
          publisher,
          edition_no: +editionNo || null,
          edition_of: +editionOf || null,
          sealed,
          condition: condition || null,
          notes,
          acquired_on: acquired || null,
          lent_to: lentTo,
          lent_on: lentOn || null,
          photo_path: photoPath,
        },
        item?.id,
        extra,
      );
      // l'ancienne photo n'est plus référencée : on la supprime du stockage
      if (item?.photo_path && item.photo_path !== photoPath) removePhoto(sb, item.photo_path).catch(() => {});
      try {
        localStorage.setItem(LAST_FORMAT, format);
      } catch {}
      toast(item ? "Exemplaire modifié" : `« ${film.title} » ajouté à ta collection`);
      if (!item) parcoursNote(film.id, "owned");
      refreshOwned();
      onSaved();
      onClose();
      if (next) onNext?.();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!sb || !userId || !item) return;
    setBusy(true);
    try {
      await deleteItem(sb, item.id);
      // la photo n'est effacée qu'une fois le délai d'annulation passé
      const photo = item.photo_path;
      let undone = false;
      if (photo) setTimeout(() => !undone && removePhoto(sb, photo).catch(() => {}), 8000);
      toast("Exemplaire retiré de ta collection", () => {
        undone = true;
        restoreItem(sb, userId, item).then(
          () => {
            refreshOwned();
            onSaved();
          },
          (err) => toast(`Impossible de le remettre : ${errorText(err)}`),
        );
      });
      refreshOwned();
      onSaved();
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <h2>
          {item ? "Modifier l'exemplaire" : "Ajouter à ma collection"} <span className="dim">{film.title}</span>
        </h2>
        <div className="block">
          Support
          <div className="formats" role="radiogroup" aria-label="Support">
            {FORMATS.map((f) => (
              <button key={f.k} type="button" role="radio" aria-checked={format === f.k} onClick={() => setFormat(f.k)}>
                {f.l}
              </button>
            ))}
            {format === "numerique" ? (
              <button type="button" role="radio" aria-checked disabled>
                Numérique
              </button>
            ) : null}
          </div>
          {item?.support_to_check ? <p className="note support-check">Support à vérifier : il a été deviné quand les steelbooks et collectors sont devenus des éditions.</p> : null}
        </div>
        <div className="block">
          Édition
          <div className="formats" role="radiogroup" aria-label="Édition">
            {PACKAGINGS.map((p) => (
              <button key={p.k} type="button" role="radio" aria-checked={packaging === p.k} onClick={() => setPackaging(p.k)}>
                {p.l}
              </button>
            ))}
          </div>
        </div>
        <div className="form-grid">
          <label>
            Nom de l'édition <span className="dim">(facultatif)</span>
            <input className="input" value={edition} maxLength={120} placeholder="30e anniversaire, version restaurée…" onChange={(e) => setEdition(e.target.value)} />
          </label>
          <label>
            Éditeur <span className="dim">(facultatif)</span>
            <input className="input" value={publisher} maxLength={80} list="editeurs" placeholder="Criterion, Carlotta…" onChange={(e) => setPublisher(e.target.value)} />
          </label>
        </div>
        <datalist id="editeurs">
          {PUBLISHERS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <label className="check">
          <input type="checkbox" checked={sealed} onChange={(e) => setSealed(e.target.checked)} /> Scellé, jamais ouvert (sous blister)
        </label>
        {more ? (
          <>
            <div className="form-grid">
              <label>
                Édition numérotée
                <span className="numbered">
                  <input className="input" type="number" min={1} inputMode="numeric" value={editionNo} placeholder="N°" aria-label="Numéro de l'exemplaire" onChange={(e) => setEditionNo(e.target.value)} />
                  <span>/</span>
                  <input className="input" type="number" min={1} inputMode="numeric" value={editionOf} placeholder="Tirage" aria-label="Tirage total" onChange={(e) => setEditionOf(e.target.value)} />
                </span>
              </label>
              <label>
                État
                <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option value="">—</option>
                  {CONDITIONS.map((c) => (
                    <option key={c.k} value={c.k}>
                      {c.l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                Acquis le
                <input className="input" type="date" value={acquired} max={today()} onChange={(e) => setAcquired(e.target.value)} />
              </label>
              <label>
                Prêté à
                <input className="input" value={lentTo} maxLength={80} placeholder="Personne" onChange={(e) => setLentTo(e.target.value)} />
              </label>
            </div>
            {lentTo.trim() ? (
              <label className="block">
                Prêté depuis le
                <input className="input" type="date" value={lentOn} max={today()} onChange={(e) => setLentOn(e.target.value)} />
              </label>
            ) : null}
            <label className="block">
              Notes
              <textarea rows={3} value={notes} maxLength={2000} placeholder="Dédicacé, fourreau, bonus…" onChange={(e) => setNotes(e.target.value)} />
            </label>
            <div className="block">
              Photo de ton exemplaire
              <div className="photo-pick">
                {shownPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shownPhoto} alt="Ton exemplaire" />
                ) : null}
                <label className="btn ghost small">
                  {shownPhoto ? "Changer la photo" : "Ajouter une photo"}
                  <input type="file" accept="image/*" hidden onChange={(e) => setNewPhoto(e.target.files?.[0] ?? null)} />
                </label>
                {shownPhoto ? (
                  <button
                    type="button"
                    className="link-btn quiet"
                    onClick={() => {
                      setNewPhoto(null);
                      setPhoto(null);
                    }}
                  >
                    Retirer
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <button type="button" className="link-btn quiet" onClick={() => setMore(true)}>
            + Numéro d'édition, état, prêt, photo, notes
          </button>
        )}
        {error ? <p className="status err">{error}</p> : null}
        <div className="dialog-actions">
          {item ? (
            <button type="button" className="btn ghost danger" disabled={busy} onClick={remove}>
              Retirer
            </button>
          ) : null}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost" onClick={onClose}>
            Annuler
          </button>
          {!item && onNext ? (
            <button type="button" className="btn" disabled={busy} onClick={() => save(true)}>
              Enregistrer et en ajouter un autre
            </button>
          ) : null}
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Enregistrement…" : item ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
