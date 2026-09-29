"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CopyDialog } from "@/components/CopyDialog";
import { PickFilm } from "@/components/PickFilm";
import { useProfile, type FilmInput } from "@/components/ProfileProvider";
import { StarsText } from "@/components/Stars";
import { ErrorLine, Loader } from "@/components/ui";
import { conditionLabel, formatLabel, FORMATS, getShare, listCollection, listWatched, saveShare, type CollectionItem, type FilmMeta, type Share } from "@/lib/collection";
import { GENRE_FR, GENRE_OPTIONS } from "@/lib/genres";
import { img } from "@/lib/tmdb";

type Mode = "possedes" | "vus";
type View = "etagere" | "mur";

/** Un film de la collection, qu'il vienne des exemplaires ou des films vus. */
type Entry = {
  key: string;
  tmdb_id: number;
  film: FilmMeta;
  formats: string[];
  copies: CollectionItem[];
  rating?: number | null;
  added?: string;
};

const year = (f: FilmMeta) => (f.release_date || "").slice(0, 4);
const decade = (f: FilmMeta) => {
  const y = +year(f);
  return y ? `${Math.floor(y / 10) * 10}` : "";
};

function SharePanel() {
  const { sb, userId, toast } = useProfile();
  const [share, setShare] = useState<Share | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (sb && userId) getShare(sb, userId).then(setShare, () => setShare(null));
  }, [sb, userId]);
  const update = async (patch: Partial<Share>) => {
    const before = share;
    // affichage immédiat, confirmé (ou annulé) par la réponse du serveur
    setShare((s) => ({ share_code: "", enabled: false, title: null, description: null, show_notes: false, show_condition: true, view_count: 0, ...s, ...patch }));
    try {
      setShare(await saveShare(sb!, userId!, patch));
    } catch (e) {
      setShare(before);
      toast(`Échec : ${(e as Error).message}`);
    }
  };
  const url = share?.share_code ? `${location.origin}/c/${share.share_code}` : "";
  return (
    <div className="share">
      <button type="button" className="btn ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Partager{share?.enabled ? " · activé" : ""}
      </button>
      {open ? (
        <div className="share-box">
          <label className="check">
            <input type="checkbox" checked={!!share?.enabled} onChange={(e) => update({ enabled: e.target.checked })} /> Page publique de ma collection
          </label>
          {share?.enabled ? (
            <>
              <div className="share-link">
                <input className="input" readOnly value={url || "Création du lien…"} onFocus={(e) => e.target.select()} />
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    navigator.clipboard.writeText(url).then(() => toast("Lien copié"));
                  }}
                >
                  Copier
                </button>
              </div>
              <label className="check">
                <input type="checkbox" checked={share.show_condition} onChange={(e) => update({ show_condition: e.target.checked })} /> Afficher l'état des
                exemplaires
              </label>
              <label className="check">
                <input type="checkbox" checked={share.show_notes} onChange={(e) => update({ show_notes: e.target.checked })} /> Afficher mes notes
              </label>
              <p className="note">
                Seuls tes exemplaires sont visibles, pas ton journal ni tes notes de films. {share.view_count ? `Vue ${share.view_count} fois.` : ""}
              </p>
            </>
          ) : (
            <p className="note">Désactivé : personne ne peut voir ta collection.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Collection() {
  const { sb } = useProfile();
  const [mode, setMode] = useState<Mode>("possedes");
  const [view, setView] = useState<View>("mur");
  const [items, setItems] = useState<CollectionItem[] | null>(null);
  const [watched, setWatched] = useState<Awaited<ReturnType<typeof listWatched>> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [q, setQ] = useState("");
  const [format, setFormat] = useState("");
  const [genre, setGenre] = useState(0);
  const [dec, setDec] = useState("");
  const [sort, setSort] = useState<"ajout" | "titre" | "annee" | "note">("ajout");
  const [adding, setAdding] = useState<"pick" | FilmInput | null>(null);
  const [editing, setEditing] = useState<{ film: FilmInput; item: CollectionItem } | null>(null);

  const loadItems = useCallback(() => {
    if (sb) listCollection(sb).then(setItems, setError);
  }, [sb]);
  useEffect(loadItems, [loadItems]);
  useEffect(() => {
    if (sb && mode === "vus" && !watched) listWatched(sb).then(setWatched, setError);
  }, [sb, mode, watched]);

  // regroupe les exemplaires par film
  const entries: Entry[] | null = useMemo(() => {
    if (mode === "possedes") {
      if (!items) return null;
      const by = new Map<number, Entry>();
      for (const it of items) {
        if (!it.films) continue;
        const e = by.get(it.tmdb_id) ?? { key: `p${it.tmdb_id}`, tmdb_id: it.tmdb_id, film: it.films, formats: [], copies: [], added: it.created_at };
        e.copies.push(it);
        if (!e.formats.includes(it.format)) e.formats.push(it.format);
        by.set(it.tmdb_id, e);
      }
      return [...by.values()];
    }
    if (!watched) return null;
    return watched.filter((w) => w.films).map((w) => ({ key: `v${w.tmdb_id}`, tmdb_id: w.tmdb_id, film: w.films!, formats: [], copies: [], rating: w.rating }));
  }, [mode, items, watched]);

  const filtered = useMemo(() => {
    if (!entries) return null;
    const needle = q.trim().toLowerCase();
    let l = entries.filter(
      (e) =>
        (!needle || e.film.title.toLowerCase().includes(needle)) &&
        (!format || e.formats.includes(format)) &&
        (!genre || e.film.genre_ids.includes(genre)) &&
        (!dec || decade(e.film) === dec),
    );
    const cmp: Record<typeof sort, (a: Entry, b: Entry) => number> = {
      ajout: (a, b) => (b.added || "").localeCompare(a.added || ""),
      titre: (a, b) => a.film.title.localeCompare(b.film.title, "fr"),
      annee: (a, b) => (b.film.release_date || "").localeCompare(a.film.release_date || ""),
      note: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    };
    l = l.slice().sort(mode === "vus" && sort === "ajout" ? cmp.titre : cmp[sort]);
    return l;
  }, [entries, q, format, genre, dec, sort, mode]);

  // statistiques
  const stats = useMemo(() => {
    if (!entries) return null;
    const count = <K extends string | number>(keys: K[]) => {
      const m = new Map<K, number>();
      for (const k of keys) if (k) m.set(k, (m.get(k) || 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    return {
      films: entries.length,
      copies: entries.reduce((s, e) => s + e.copies.length, 0),
      formats: count(entries.flatMap((e) => e.copies.map((c) => c.format))).sort((x, y) => FORMATS.findIndex((f) => f.k === x[0]) - FORMATS.findIndex((f) => f.k === y[0])),
      decades: count(entries.map((e) => decade(e.film))),
      genres: count(entries.flatMap((e) => e.film.genre_ids)),
    };
  }, [entries]);

  const openFilm = (e: Entry): FilmInput => ({ id: e.tmdb_id, title: e.film.title, release_date: e.film.release_date ?? undefined, poster_path: e.film.poster_path, genre_ids: e.film.genre_ids });

  // étagères : par format (un film possédé en deux formats est sur les deux), ou par décennie pour les films vus
  const shelves = useMemo(() => {
    if (!filtered) return [];
    const groups = new Map<string, Entry[]>();
    const push = (k: string, e: Entry) => groups.set(k, [...(groups.get(k) ?? []), e]);
    for (const e of filtered) {
      if (mode === "possedes") for (const f of e.formats) (!format || f === format) && push(formatLabel(f), e);
      else push(decade(e.film) ? `Années ${decade(e.film)}` : "Sans date", e);
    }
    const order: string[] = FORMATS.map((f) => f.l);
    return [...groups.entries()].sort((x, y) => (mode === "possedes" ? order.indexOf(x[0]) - order.indexOf(y[0]) : y[0].localeCompare(x[0])));
  }, [filtered, mode, format]);

  const tile = (e: Entry) => (
    <Link key={e.key} href={`/film/${e.tmdb_id}`} className="tile" title={`${e.film.title} (${year(e.film)})`}>
      <span className="poster">{e.film.poster_path ? <img src={img(e.film.poster_path, "w185")} alt={e.film.title} loading="lazy" /> : <span className="noimg">{e.film.title}</span>}</span>
      {mode === "possedes" && e.copies.length > 1 ? <span className="count">×{e.copies.length}</span> : null}
    </Link>
  );

  const hasFilter = !!(q || format || genre || dec);
  const decades = stats ? [...stats.decades].sort((a, b) => +b[0] - +a[0]) : [];

  return (
    <>
      <div className="page-head">
        <h1>Collection</h1>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn primary" onClick={() => setAdding("pick")}>
            + Ajouter un film
          </button>
          <SharePanel />
        </div>
      </div>

      <div className="coll-bar">
        <div className="choice" role="radiogroup" aria-label="Afficher">
          <button type="button" role="radio" aria-checked={mode === "possedes"} onClick={() => (setMode("possedes"), setFormat(""))}>
            Mes exemplaires
          </button>
          <button type="button" role="radio" aria-checked={mode === "vus"} onClick={() => (setMode("vus"), setFormat(""))}>
            Films vus
          </button>
        </div>
        <div className="choice" role="radiogroup" aria-label="Vue">
          <button type="button" role="radio" aria-checked={view === "mur"} onClick={() => setView("mur")}>
            Mur d'affiches
          </button>
          <button type="button" role="radio" aria-checked={view === "etagere"} onClick={() => setView("etagere")}>
            Étagère
          </button>
        </div>
      </div>

      {stats && stats.films ? (
        <p className="coll-stats">
          <b>{stats.films.toLocaleString("fr-FR")}</b> {mode === "possedes" ? "films" : "films vus"}
          {mode === "possedes" && stats.copies !== stats.films ? ` · ${stats.copies} exemplaires` : ""}
          {mode === "possedes"
            ? stats.formats.map(([f, n]) => (
                <button key={f} type="button" className={`chip${format === f ? " on" : ""}`} onClick={() => setFormat(format === f ? "" : f)}>
                  {formatLabel(f)} {n}
                </button>
              ))
            : null}
          {stats.genres.length ? <span className="dim"> · surtout {stats.genres.slice(0, 3).map(([g]) => GENRE_FR[+g]?.toLowerCase()).filter(Boolean).join(", ")}</span> : null}
          {stats.decades.length ? <span className="dim"> · années {stats.decades[0][0]} en tête</span> : null}
        </p>
      ) : null}

      <div className="filterbar">
        <input className="input search-in" type="search" placeholder="Filtrer par titre" value={q} onChange={(e) => setQ(e.target.value)} />
        <label>
          Genre
          <select value={genre} onChange={(e) => setGenre(+e.target.value)}>
            <option value={0}>Tous</option>
            {GENRE_OPTIONS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Décennie
          <select value={dec} onChange={(e) => setDec(e.target.value)}>
            <option value="">Toutes</option>
            {decades.map(([d, n]) => (
              <option key={d} value={d}>
                {d}s ({n})
              </option>
            ))}
          </select>
        </label>
        <label>
          Tri
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            {mode === "possedes" ? <option value="ajout">Ajout récent</option> : null}
            <option value="titre">Titre</option>
            <option value="annee">Année</option>
            {mode === "vus" ? <option value="note">Ta note</option> : null}
          </select>
        </label>
        {hasFilter ? (
          <button type="button" className="link-btn" onClick={() => (setQ(""), setFormat(""), setGenre(0), setDec(""))}>
            Effacer les filtres
          </button>
        ) : null}
        {filtered ? <span className="count">{filtered.length} films</span> : null}
      </div>

      {error ? (
        <ErrorLine error={error} />
      ) : !filtered ? (
        <Loader text="Chargement de la collection…" />
      ) : !entries?.length ? (
        <div className="empty">
          {mode === "possedes" ? (
            <>
              <p>Ta collection est vide.</p>
              <p className="note">Ajoute tes DVD, Blu-ray, 4K… avec « + Ajouter un film », ou depuis la fiche d'un film (« + Ajouter à ma collection »).</p>
            </>
          ) : (
            <p>Aucun film vu pour l'instant.</p>
          )}
        </div>
      ) : !filtered.length ? (
        <p className="status">Aucun film ne correspond à ces filtres.</p>
      ) : view === "mur" ? (
        <div className="wall">{filtered.map(tile)}</div>
      ) : (
        shelves.map(([label, list]) => (
          <section key={label} className="shelf">
            <h2>
              {label} <span className="dim">{list.length}</span>
            </h2>
            <ul className="shelf-list">
              {list.map((e) => (
                <li key={e.key}>
                  {tile(e)}
                  <div className="shelf-info">
                    <Link href={`/film/${e.tmdb_id}`} className="t">
                      {e.film.title}
                    </Link>
                    <span className="dim">{year(e.film)}</span>
                    {mode === "vus" ? <StarsText value={e.rating} /> : null}
                    {e.copies.map((c) => (
                      <button key={c.id} type="button" className="copy-line" onClick={() => setEditing({ film: openFilm(e), item: c })} title="Modifier cet exemplaire">
                        {formatLabel(c.format)}
                        {c.edition ? ` · ${c.edition}` : ""}
                        {c.condition ? ` · ${conditionLabel(c.condition)}` : ""}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {adding === "pick" ? <PickFilm onClose={() => setAdding(null)} onPick={(m) => setAdding(m)} /> : null}
      {adding && adding !== "pick" ? <CopyDialog film={adding} onClose={() => setAdding(null)} onSaved={loadItems} /> : null}
      {editing ? <CopyDialog film={editing.film} item={editing.item} onClose={() => setEditing(null)} onSaved={loadItems} /> : null}
    </>
  );
}

export default function Page() {
  return <Collection />;
}
