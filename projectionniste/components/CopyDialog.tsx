"use client";

import { useEffect, useRef, useState } from "react";
import { CONDITIONS, deleteItem, FORMATS, saveItem, type CollectionItem, type Format } from "@/lib/collection";
import { filmRow } from "@/lib/db";
import { today } from "@/lib/format";
import { useProfile, type FilmInput } from "./ProfileProvider";

/** Ajouter ou modifier un exemplaire : format, édition, état, notes, date d'acquisition. */
export function CopyDialog({ film, item, onClose, onSaved }: { film: FilmInput; item?: CollectionItem; onClose: () => void; onSaved: () => void }) {
  const { sb, userId, toast } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<Format>(item?.format ?? "bluray");
  const [edition, setEdition] = useState(item?.edition ?? "");
  const [condition, setCondition] = useState(item?.condition ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [acquired, setAcquired] = useState(item?.acquired_on ?? "");
  const [more, setMore] = useState(!!(item?.condition || item?.notes || item?.acquired_on));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => ref.current?.showModal(), []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb || !userId) return;
    setBusy(true);
    setError(null);
    try {
      await saveItem(sb, userId, filmRow(film), { format, edition, condition: condition || null, notes, acquired_on: acquired || null }, item?.id);
      toast(item ? "Exemplaire modifié" : `« ${film.title} » ajouté à ta collection`);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!sb || !item || !confirm("Retirer cet exemplaire de ta collection ?")) return;
    setBusy(true);
    try {
      await deleteItem(sb, item.id);
      toast("Exemplaire retiré de ta collection");
      onSaved();
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
          {item ? "Modifier l'exemplaire" : "Ajouter à ma collection"} <span className="dim">{film.title}</span>
        </h2>
        <div className="block">
          Format
          <div className="formats" role="radiogroup" aria-label="Format">
            {FORMATS.map((f) => (
              <button key={f.k} type="button" role="radio" aria-checked={format === f.k} onClick={() => setFormat(f.k)}>
                {f.l}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          Édition <span className="dim">(facultatif)</span>
          <input className="input" value={edition} maxLength={120} placeholder="Criterion, Carlotta, coffret 4K…" onChange={(e) => setEdition(e.target.value)} />
        </label>
        {more ? (
          <>
            <div className="form-row">
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
              <label>
                Acquis le
                <input type="date" value={acquired} max={today()} onChange={(e) => setAcquired(e.target.value)} />
              </label>
            </div>
            <label className="block">
              Notes
              <textarea rows={3} value={notes} maxLength={2000} placeholder="Dédicacé, fourreau, bonus…" onChange={(e) => setNotes(e.target.value)} />
            </label>
          </>
        ) : (
          <button type="button" className="link-btn quiet" onClick={() => setMore(true)}>
            + État, date d'acquisition, notes
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
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Enregistrement…" : item ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
