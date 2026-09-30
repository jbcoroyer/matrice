"use client";

import { errorText } from "@/lib/errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilmCard } from "@/components/FilmCard";
import { ListDialog } from "@/components/ListDialogs";
import { PickFilm } from "@/components/PickFilm";
import { Poster } from "@/components/Poster";
import { useProfile, type FilmInput } from "@/components/ProfileProvider";
import { BackLink } from "@/components/Rail";
import { ErrorLine, Loader } from "@/components/ui";
import { filmRow } from "@/lib/db";
import { addToList, getList, removeFromList, setItemNote, updateList, writePositions, type ListItem, type ListMeta } from "@/lib/lists";
import { supabase } from "@/lib/supabase";
import { img } from "@/lib/tmdb";

type Data = { list: ListMeta; items: ListItem[]; owner: string | null };
type Sort = "list" | "title" | "new" | "old";

const yearOf = (it: ListItem) => (it.films?.release_date || "").slice(0, 4);
const asMovie = (it: ListItem) => ({
  id: it.tmdb_id,
  title: it.films?.title ?? "Sans titre",
  release_date: it.films?.release_date ?? "",
  poster_path: it.films?.poster_path ?? null,
  genre_ids: it.films?.genre_ids ?? [],
});

/** Une liste : lisible par tous si elle est publique, modifiable par son auteur. */
export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status, userId, seen, toast, confirm } = useProfile();
  const router = useRouter();
  const [data, setData] = useState<Data | null | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [settings, setSettings] = useState(false);
  const [sort, setSort] = useState<Sort>("list");
  const [hideSeen, setHideSeen] = useState(false);
  const [view, setView] = useState<"grille" | "details">("grille");

  // positions telles qu'enregistrées en base, et file d'écriture pour garder l'ordre des déplacements
  const dbPos = useRef(new Map<number, number>());
  const queue = useRef<Promise<void>>(Promise.resolve());

  const load = useCallback(() => {
    const sb = supabase();
    if (!sb) return setError(new Error("Service indisponible."));
    setError(null);
    getList(sb, id).then((d) => {
      dbPos.current = new Map(d?.items.map((it) => [it.tmdb_id, it.position]));
      setData(d);
    }, setError);
  }, [id]);

  useEffect(() => {
    if (status !== "loading") load();
  }, [status, load]);

  const mine = status === "ready" && !!data && data.list.user_id === userId;

  // arrivée depuis « Nouvelle liste » : on ouvre directement la recherche de films
  useEffect(() => {
    if (!mine) return;
    const q = new URLSearchParams(location.search);
    if (q.get("ajout") === "1") {
      setPicking(true);
      history.replaceState(null, "", location.pathname);
    }
  }, [mine]);

  const items = data?.items ?? [];
  const inList = useMemo(() => new Set(items.map((it) => it.tmdb_id)), [items]);
  const seenCount = useMemo(() => items.filter((it) => seen.has(it.tmdb_id)).length, [items, seen]);

  const setItems = (f: (items: ListItem[]) => ListItem[]) => setData((d) => (d ? { ...d, items: f(d.items) } : d));

  const persistOrder = (order: ListItem[]) => {
    const sb = supabase();
    if (!sb) return;
    queue.current = queue.current
      .then(async () => {
        const rows = order.map((it, i) => ({ tmdb_id: it.tmdb_id, position: i + 1 })).filter((r) => dbPos.current.get(r.tmdb_id) !== r.position);
        await writePositions(sb, id, rows);
        for (const r of rows) dbPos.current.set(r.tmdb_id, r.position);
      })
      .catch((e: Error) => {
        toast(`Échec du déplacement : ${errorText(e)}`);
        load();
      });
  };

  const move = (from: number, to: number) => {
    if (!data) return;
    to = Math.max(0, Math.min(items.length - 1, to));
    if (from === to) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setItems(() => next);
    persistOrder(next);
  };

  const add = async (m: FilmInput) => {
    const sb = supabase();
    if (!sb || inList.has(m.id)) return;
    const film = filmRow(m);
    const temp: ListItem = { tmdb_id: m.id, position: 0, note: null, films: { title: m.title, release_date: m.release_date ?? null, poster_path: m.poster_path ?? null, genre_ids: m.genre_ids ?? [] } };
    setItems((l) => [...l, temp]);
    try {
      const position = await addToList(sb, id, film);
      dbPos.current.set(m.id, position);
      setItems((l) => l.map((it) => (it.tmdb_id === m.id ? { ...it, position } : it)));
    } catch (e) {
      setItems((l) => l.filter((it) => it.tmdb_id !== m.id));
      toast(`Échec : ${errorText(e)}`);
    }
  };

  const remove = async (it: ListItem) => {
    const sb = supabase();
    if (!sb) return;
    const index = items.indexOf(it);
    setItems((l) => l.filter((x) => x.tmdb_id !== it.tmdb_id));
    try {
      await removeFromList(sb, id, it.tmdb_id);
      const position = dbPos.current.get(it.tmdb_id) ?? it.position;
      dbPos.current.delete(it.tmdb_id);
      toast(`« ${it.films?.title ?? "Film"} » retiré de la liste`, async () => {
        try {
          await addToList(sb, id, filmRow(asMovie(it)), { position, note: it.note });
          dbPos.current.set(it.tmdb_id, position);
          setItems((l) => {
            const n = [...l];
            n.splice(Math.min(index, n.length), 0, { ...it, position });
            return n;
          });
        } catch (e) {
          toast(`Échec : ${errorText(e)}`);
        }
      });
    } catch (e) {
      setItems((l) => {
        const n = [...l];
        n.splice(index, 0, it);
        return n;
      });
      toast(`Échec : ${errorText(e)}`);
    }
  };

  const saveNote = async (it: ListItem, note: string) => {
    const sb = supabase();
    if (!sb || (it.note ?? "") === note.trim()) return;
    setItems((l) => l.map((x) => (x.tmdb_id === it.tmdb_id ? { ...x, note: note.trim() || null } : x)));
    try {
      await setItemNote(sb, id, it.tmdb_id, note);
    } catch (e) {
      setItems((l) => l.map((x) => (x.tmdb_id === it.tmdb_id ? it : x)));
      toast(`Échec : ${errorText(e)}`);
    }
  };

  const share = async () => {
    if (!data) return;
    const sb = supabase();
    if (mine && !data.list.is_public) {
      if (!sb || !(await confirm({ title: "Rendre la liste publique ?", message: "Cette liste est privée. Pour la partager, il faut la rendre publique : toute personne ayant le lien pourra la voir, même sans compte.", confirmLabel: "Rendre publique et partager" }))) return;
      try {
        const list = await updateList(sb, id, { is_public: true });
        setData((d) => (d ? { ...d, list } : d));
      } catch (e) {
        return toast(`Échec : ${errorText(e)}`);
      }
    }
    const url = `${location.origin}/listes/${id}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: data.list.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lien de la liste copié");
      }
    } catch {}
  };

  if (error) return <ErrorLine error={error} onRetry={load} />;
  if (data === undefined) return <Loader text="Chargement de la liste…" />;
  if (data === null)
    return (
      <section className="section">
        <h1>Liste introuvable</h1>
        <p className="lede">Ce lien n'existe pas, la liste a été supprimée, ou elle est privée.</p>
        {status === "ready" ? (
          <Link className="btn ghost" href="/listes">
            Voir mes listes
          </Link>
        ) : (
          <Link className="btn ghost" href="/">
            Se connecter
          </Link>
        )}
      </section>
    );

  const { list, owner } = data;
  const ranked = list.ranked;
  let shown = items.map((it, i) => ({ it, rank: i + 1 }));
  if (!editing) {
    if (hideSeen) shown = shown.filter(({ it }) => !seen.has(it.tmdb_id));
    if (sort === "title") shown.sort((a, b) => (a.it.films?.title ?? "").localeCompare(b.it.films?.title ?? "", "fr"));
    if (sort === "new") shown.sort((a, b) => yearOf(b.it).localeCompare(yearOf(a.it)));
    if (sort === "old") shown.sort((a, b) => (yearOf(a.it) || "9999").localeCompare(yearOf(b.it) || "9999"));
  }
  const pct = items.length ? Math.round((seenCount / items.length) * 100) : 0;

  return (
    <section className="section list-page">
      {mine ? <BackLink href="/listes" label="Mes listes" /> : null}
      <header className="list-head">
        <p className="kicker">
          {mine ? "Ta liste" : owner ? `Une liste de ${owner}` : "Une liste"}
          {" · "}
          {list.is_public ? "publique" : "privée"}
          {ranked ? " · classée" : ""}
        </p>
        <h1>{list.title}</h1>
        {list.description ? <p className="lede list-desc">{list.description}</p> : null}
        <p className="list-meta">
          {items.length} film{items.length > 1 ? "s" : ""}
          {status === "ready" && seenCount ? (
            <>
              {" · "}
              <span className="seen-bar" style={{ "--p": `${pct}%` } as React.CSSProperties}>
                tu en as vu {seenCount} ({pct} %)
              </span>
            </>
          ) : null}
        </p>
        <div className="row-actions">
          {mine ? (
            <>
              <button type="button" className="btn primary" onClick={() => setPicking(true)}>
                + Ajouter des films
              </button>
              {items.length > 1 ? (
                <button type="button" className={`btn${editing ? " on" : ""}`} aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
                  {editing ? "Terminé" : "Réorganiser et commenter"}
                </button>
              ) : null}
              <button type="button" className="btn ghost" onClick={() => setSettings(true)}>
                Modifier la liste
              </button>
            </>
          ) : null}
          {list.is_public || mine ? (
            <button type="button" className="btn ghost" onClick={share}>
              Partager
            </button>
          ) : null}
        </div>
      </header>

      {!items.length ? (
        <p className="status">{mine ? "Cette liste est vide. Ajoute des films pour la commencer." : "Cette liste est vide."}</p>
      ) : editing ? (
        <EditRows items={items} ranked={ranked} onMove={move} onRemove={remove} onNote={saveNote} />
      ) : (
        <>
          <div className="filterbar">
            <label>
              Ordre
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="list">{ranked ? "Classement" : "Ordre de la liste"}</option>
                <option value="title">Titre</option>
                <option value="new">Plus récents</option>
                <option value="old">Plus anciens</option>
              </select>
            </label>
            {status === "ready" && seenCount ? (
              <label>
                <input type="checkbox" checked={hideSeen} onChange={(e) => setHideSeen(e.target.checked)} /> Masquer les films vus
              </label>
            ) : null}
            <span className="seg" role="group" aria-label="Affichage">
              <button type="button" aria-pressed={view === "grille"} onClick={() => setView("grille")}>
                Affiches
              </button>
              <button type="button" aria-pressed={view === "details"} onClick={() => setView("details")}>
                Détails
              </button>
            </span>
          </div>
          {!shown.length ? (
            <p className="status">Tu as vu tous les films de cette liste.</p>
          ) : view === "grille" ? (
            <ol className={`grid list-grid${ranked ? " ranked" : ""}`}>
              {shown.map(({ it, rank }) => (
                <li key={it.tmdb_id}>
                  {ranked ? <span className="rank">{rank}</span> : null}
                  {status === "ready" ? (
                    <FilmCard m={asMovie(it)} />
                  ) : (
                    <Link className="card" href={`/film/${it.tmdb_id}`}>
                      <Poster path={it.films?.poster_path} title={it.films?.title ?? ""} />
                      <h3>{it.films?.title}</h3>
                      <div className="meta">{yearOf(it)}</div>
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <ol className="list-rows">
              {shown.map(({ it, rank }) => (
                <li key={it.tmdb_id}>
                  {ranked ? <span className="rank">{rank}</span> : null}
                  <Link className="thumb" href={`/film/${it.tmdb_id}`} tabIndex={-1} aria-hidden>
                    {it.films?.poster_path ? <img src={img(it.films.poster_path, "w92")} alt="" loading="lazy" /> : null}
                  </Link>
                  <div className="row-body">
                    <Link href={`/film/${it.tmdb_id}`} className="t">
                      {it.films?.title}
                    </Link>{" "}
                    <span className="dim">{yearOf(it)}</span>
                    {status === "ready" && seen.has(it.tmdb_id) ? <span className="badge inline">Vu</span> : null}
                    {it.note ? <p className="row-note">{it.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {status !== "ready" ? (
        <p className="note list-invite">
          <Link href="/">Crée ton compte</Link> pour noter tes films, tenir ton journal et faire tes propres listes.
        </p>
      ) : null}

      {picking ? <PickFilm title="Ajouter des films à la liste" picked={inList} onPick={add} onClose={() => setPicking(false)} /> : null}
      {settings ? (
        <ListDialog
          list={list}
          onClose={() => setSettings(false)}
          onSaved={(l) => setData((d) => (d ? { ...d, list: l } : d))}
          onDeleted={() => router.replace("/listes")}
        />
      ) : null}
    </section>
  );
}

/** Mode réorganisation : glisser-déposer, flèches, numéro de place, commentaire, retrait. */
function EditRows({
  items,
  ranked,
  onMove,
  onRemove,
  onNote,
}: {
  items: ListItem[];
  ranked: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (it: ListItem) => void;
  onNote: (it: ListItem, note: string) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [noting, setNoting] = useState<number | null>(null);
  return (
    <>
      <p className="note">Glisse les films pour changer leur ordre, ou utilise les flèches{ranked ? " et le numéro de place" : ""}. Chaque changement est enregistré aussitôt.</p>
      <ol className="list-rows editing">
        {items.map((it, i) => (
          <li
            key={it.tmdb_id}
            className={[drag === i ? "dragging" : "", over === i && drag !== null && drag !== i ? (drag < i ? "drop-after" : "drop-before") : ""].filter(Boolean).join(" ")}
            draggable
            onDragStart={(e) => {
              setDrag(i);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragOver={(e) => {
              if (drag === null) return;
              e.preventDefault();
              if (over !== i) setOver(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (drag !== null) onMove(drag, i);
              setDrag(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDrag(null);
              setOver(null);
            }}
          >
            <span className="grip" aria-hidden title="Glisser pour déplacer">
              ⋮⋮
            </span>
            {ranked ? (
              <input
                key={`${it.tmdb_id}-${i}`}
                className="rank-in"
                type="number"
                min={1}
                max={items.length}
                defaultValue={i + 1}
                aria-label={`Place de ${it.films?.title}`}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                onBlur={(e) => {
                  const v = Math.round(+e.target.value);
                  if (v && v !== i + 1) onMove(i, v - 1);
                  else e.target.value = String(i + 1);
                }}
              />
            ) : null}
            <span className="thumb">{it.films?.poster_path ? <img src={img(it.films.poster_path, "w92")} alt="" /> : null}</span>
            <div className="row-body">
              <span className="t">{it.films?.title}</span> <span className="dim">{yearOf(it)}</span>
              {noting === i ? (
                <textarea
                  className="row-note-in"
                  autoFocus
                  rows={2}
                  maxLength={1000}
                  defaultValue={it.note ?? ""}
                  placeholder="Pourquoi ce film est dans la liste…"
                  onBlur={(e) => {
                    onNote(it, e.target.value);
                    setNoting(null);
                  }}
                  onKeyDown={(e) => e.key === "Escape" && (e.currentTarget.blur(), e.stopPropagation())}
                />
              ) : it.note ? (
                <button type="button" className="row-note link-like" onClick={() => setNoting(i)} title="Modifier le commentaire">
                  {it.note}
                </button>
              ) : (
                <button type="button" className="link-btn quiet" onClick={() => setNoting(i)}>
                  + Commentaire
                </button>
              )}
            </div>
            <span className="row-tools">
              <button type="button" className="icon-btn" disabled={i === 0} onClick={() => onMove(i, i - 1)} aria-label={`Monter ${it.films?.title}`} title="Monter">
                ↑
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={i === items.length - 1}
                onClick={() => onMove(i, i + 1)}
                aria-label={`Descendre ${it.films?.title}`}
                title="Descendre"
              >
                ↓
              </button>
              <button type="button" className="icon-btn" onClick={() => onRemove(it)} aria-label={`Retirer ${it.films?.title} de la liste`} title="Retirer de la liste">
                ×
              </button>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
