"use client";

import { errorText } from "@/lib/errors";
import { useEffect, useMemo, useRef, useState } from "react";
import { filmRow } from "@/lib/db";
import { addToList, createList, deleteList, listsWithFilm, myLists, removeFromList, updateList, type ListMeta, type ListSummary } from "@/lib/lists";
import { img } from "@/lib/tmdb";
import { Check } from "./icons";
import { useProfile, type FilmInput } from "./ProfileProvider";

/** Créer une liste, ou modifier son titre, sa description, son classement, sa visibilité. */
export function ListDialog({
  list,
  onClose,
  onSaved,
  onDeleted,
}: {
  list?: ListMeta;
  onClose: () => void;
  onSaved: (l: ListMeta) => void;
  onDeleted?: () => void;
}) {
  const { sb, userId, toast, confirm } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(list?.title ?? "");
  const [description, setDescription] = useState(list?.description ?? "");
  const [ranked, setRanked] = useState(list?.ranked ?? false);
  const [pub, setPub] = useState(list?.is_public ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => ref.current?.showModal(), []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb || !userId || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const input = { title, description, ranked, is_public: pub };
      const saved = list ? await updateList(sb, list.id, input) : await createList(sb, userId, input);
      toast(list ? "Liste enregistrée" : `Liste « ${saved.title} » créée`);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!sb || !list) return;
    const ok = await confirm({ title: "Supprimer la liste ?", message: `« ${list.title} » sera supprimée définitivement, avec l'ordre et les notes de ses films. Les films eux-mêmes ne sont pas touchés.`, confirmLabel: "Supprimer la liste", danger: true });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteList(sb, list.id);
      toast("Liste supprimée");
      onDeleted?.();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <form onSubmit={save}>
        <h2>{list ? "Modifier la liste" : "Nouvelle liste"}</h2>
        <label className="block">
          Titre
          <input className="input wide" required autoFocus maxLength={120} value={title} placeholder="Mes westerns préférés, À voir en famille…" onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          Description <span className="dim">(facultatif)</span>
          <textarea rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={ranked} onChange={(e) => setRanked(e.target.checked)} /> Liste classée <span className="dim">— les films sont numérotés</span>
        </label>
        <fieldset className="choice">
          <legend>Visibilité</legend>
          <label className="check">
            <input type="radio" name="vis" checked={!pub} onChange={() => setPub(false)} /> Privée <span className="dim">— toi seul</span>
          </label>
          <label className="check">
            <input type="radio" name="vis" checked={pub} onChange={() => setPub(true)} /> Publique <span className="dim">— toute personne qui a le lien, même sans compte</span>
          </label>
        </fieldset>
        {list?.letterboxd_url ? <p className="note">Importée de Letterboxd : un nouvel import remplacera ses films (le titre, le classement et la visibilité restent).</p> : null}
        {error ? <p className="status err">{error}</p> : null}
        <div className="dialog-actions">
          {list ? (
            <button type="button" className="btn ghost danger" disabled={busy} onClick={remove}>
              Supprimer la liste
            </button>
          ) : null}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn primary" disabled={busy || !title.trim()}>
            {busy ? "Enregistrement…" : list ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** Depuis une fiche film : cocher les listes qui doivent le contenir, ou en créer une. */
export function AddToListDialog({ film, onClose, onChange }: { film: FilmInput; onClose: () => void; onChange?: (n: number) => void }) {
  const { sb, userId, toast } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  const [lists, setLists] = useState<ListSummary[] | null>(null);
  const [inside, setInside] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => ref.current?.showModal(), []);
  useEffect(() => {
    if (!sb || !userId) return;
    Promise.all([myLists(sb, userId), listsWithFilm(sb, userId, film.id)]).then(
      ([l, s]) => {
        setLists(l);
        setInside(s);
      },
      (e) => setError(errorText(e)),
    );
  }, [sb, userId, film.id]);
  useEffect(() => {
    if (lists) onChange?.(inside.size);
  }, [lists, inside, onChange]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (lists ?? []).filter((l) => !k || l.title.toLowerCase().includes(k));
  }, [lists, q]);

  const toggle = async (l: ListSummary) => {
    if (!sb) return;
    const has = inside.has(l.id);
    const flip = (on: boolean) =>
      setInside((s) => {
        const n = new Set(s);
        if (on) n.add(l.id);
        else n.delete(l.id);
        return n;
      });
    flip(!has);
    try {
      if (has) await removeFromList(sb, l.id, film.id);
      else await addToList(sb, l.id, filmRow(film));
      setLists((ls) => ls?.map((x) => (x.id === l.id ? { ...x, count: x.count + (has ? -1 : 1) } : x)) ?? null);
    } catch (e) {
      flip(has);
      toast(`Échec : ${errorText(e)}`);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb || !userId || !creating.trim()) return;
    try {
      const l = await createList(sb, userId, { title: creating, description: null, ranked: false, is_public: false });
      await addToList(sb, l.id, filmRow(film));
      setLists((ls) => [{ ...l, count: 1, posters: [film.poster_path ?? null] }, ...(ls ?? [])]);
      setInside((s) => new Set(s).add(l.id));
      setCreating("");
      toast(`Liste « ${l.title} » créée`);
    } catch (err) {
      toast(`Échec : ${errorText(err)}`);
    }
  };

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <h2>
        Ajouter à une liste <span className="dim">{film.title}</span>
      </h2>
      {error ? <p className="status err">{error}</p> : null}
      {!lists && !error ? <p className="status">Chargement…</p> : null}
      {lists && lists.length > 8 ? <input className="input wide" placeholder="Filtrer mes listes" value={q} onChange={(e) => setQ(e.target.value)} /> : null}
      {lists ? (
        <ul className="list-pick">
          {shown.map((l) => {
            const on = inside.has(l.id);
            return (
              <li key={l.id}>
                <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(l)}>
                  <span className="box">{on ? <Check /> : null}</span>
                  <span className="t">{l.title}</span>
                  <span className="dim">
                    {l.count} film{l.count > 1 ? "s" : ""}
                    {l.is_public ? "" : " · privée"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <form className="list-new" onSubmit={create}>
        <input className="input" maxLength={120} placeholder="Nouvelle liste…" value={creating} onChange={(e) => setCreating(e.target.value)} aria-label="Titre de la nouvelle liste" />
        <button type="submit" className="btn" disabled={!creating.trim()}>
          Créer et ajouter
        </button>
      </form>
      <div className="dialog-actions">
        <span style={{ flex: 1 }} />
        <button type="button" className="btn" onClick={onClose}>
          Terminé
        </button>
      </div>
    </dialog>
  );
}

/** Cinq affiches qui se chevauchent, comme une pile de jaquettes. */
export function ListCover({ posters }: { posters: (string | null)[] }) {
  const slots = [...posters, null, null, null, null, null].slice(0, 5);
  return (
    <span className="list-cover" aria-hidden>
      {slots.map((p, i) => (
        <span key={i} className="poster">
          {p ? <img src={img(p, "w185")} alt="" loading="lazy" /> : null}
        </span>
      ))}
    </span>
  );
}
