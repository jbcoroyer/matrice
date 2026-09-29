"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Classeur } from "@/components/Classeur";
import { CollectionCard, Spine } from "@/components/CollectionCard";
import { CopyDialog } from "@/components/CopyDialog";
import { EyeOff, Plus, Share } from "@/components/icons";
import { PickFilm } from "@/components/PickFilm";
import { Poster } from "@/components/Poster";
import { useProfile, type FilmInput } from "@/components/ProfileProvider";
import { ErrorLine, Loader, ProfileGate } from "@/components/ui";
import {
  addWant,
  backfillExtras,
  compareByDirector,
  directorIdOf,
  directorName,
  formatLabel,
  FORMATS,
  getShare,
  groupEntries,
  listCollection,
  listWants,
  removeWant,
  saveShare,
  type CollectionItem,
  type Entry,
  type Share as ShareT,
  type Want,
} from "@/lib/collection";
import { filmRow } from "@/lib/db";
import { yearOf } from "@/lib/format";
import { GENRE_OPTIONS } from "@/lib/genres";
import { img } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";

type Mode = "cinematheque" | "envies";
type View = "vitrine" | "etagere" | "classeur";
type Quick = "tous" | "jamais" | "scelles" | "limitees" | "prets";

const VIEW_KEY = "projo.collectionView";
const STEP = 60;

const decade = (d: string | null) => {
  const y = +(d || "").slice(0, 4);
  return y ? `${Math.floor(y / 10) * 10}` : "";
};

function SharePanel() {
  const { sb, userId, toast } = useProfile();
  const [share, setShare] = useState<ShareT | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (sb && userId) getShare(sb, userId).then(setShare, () => setShare(null));
  }, [sb, userId]);
  const update = async (patch: Partial<ShareT>) => {
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
      <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Share />
        Partager{share?.enabled ? " · activé" : ""}
      </button>
      {open ? (
        <div className="share-box">
          <label className="check">
            <input type="checkbox" checked={!!share?.enabled} onChange={(e) => update({ enabled: e.target.checked })} /> Page publique de ma cinémathèque
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
                <input type="checkbox" checked={share.show_condition} onChange={(e) => update({ show_condition: e.target.checked })} /> Afficher l'état des exemplaires
              </label>
              <label className="check">
                <input type="checkbox" checked={share.show_notes} onChange={(e) => update({ show_notes: e.target.checked })} /> Afficher mes notes et mes photos
              </label>
              <p className="note">
                Seuls tes exemplaires sont visibles : ni ton journal, ni les films que tu as vus, ni tes prêts. {share.view_count ? `Vue ${share.view_count} fois.` : ""}
              </p>
            </>
          ) : (
            <p className="note">Désactivé : personne ne peut voir ta cinémathèque.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Collection() {
  const { sb, userId, seen, rated, toast, refreshOwned } = useProfile();
  const [mode, setMode] = useState<Mode>("cinematheque");
  const [view, setView] = useState<View>("vitrine");
  const [items, setItems] = useState<CollectionItem[] | null>(null);
  const [wants, setWants] = useState<Want[] | null>(null);
  const [openDir, setOpenDir] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [q, setQ] = useState("");
  const [format, setFormat] = useState("");
  const [quick, setQuick] = useState<Quick>("tous");
  const [genre, setGenre] = useState(0);
  const [dec, setDec] = useState("");
  const [sort, setSort] = useState<"realisateur" | "recent" | "numero" | "titre" | "annee" | "note">("realisateur");
  const [limit, setLimit] = useState(STEP);
  const [adding, setAdding] = useState<"pick" | FilmInput | null>(null);
  const [editing, setEditing] = useState<{ film: FilmInput; item: CollectionItem } | null>(null);
  const [finding, setFinding] = useState<FilmInput | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "vitrine" || v === "etagere" || v === "classeur") setView(v);
    } catch {}
  }, []);
  const pickView = (v: View) => {
    if (openDir) openDirector(null);
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const loadItems = useCallback(() => {
    if (sb) listCollection(sb).then(setItems, setError);
  }, [sb]);
  const loadWants = useCallback(() => {
    if (sb) listWants(sb).then(setWants, setError);
  }, [sb]);
  useEffect(() => {
    loadItems();
    loadWants();
  }, [loadItems, loadWants]);

  // un réalisateur ouvert dans le classeur a sa propre adresse (?realisateur=…) : le retour du navigateur fonctionne
  useEffect(() => {
    const read = () => {
      const id = +(new URLSearchParams(location.search).get("realisateur") || 0);
      setOpenDir(id || null);
      if (id) setView("classeur");
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  const openDirector = (id: number | null) => {
    history.pushState({}, "", id ? `?realisateur=${id}` : location.pathname);
    setOpenDir(id);
    window.scrollTo({ top: 0 });
  };

  // anciens exemplaires sans réalisateur : on complète en arrière-plan
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (!sb || !items || filled) return;
    setFilled(true);
    backfillExtras(sb, items, (id, x) => setItems((prev) => prev?.map((i) => (i.tmdb_id === id ? { ...i, ...x, director: x.director ?? "" } : i)) ?? prev));
  }, [sb, items, filled]);

  const all = useMemo(() => (items ? groupEntries(items) : null), [items]);
  const total = all?.length ?? 0;

  const isLimited = (e: Entry) => e.copies.some((c) => c.edition_no || c.format === "collector" || /limit|collector|numérot|numerot/i.test(c.edition || ""));
  const filtered = useMemo(() => {
    if (!all) return null;
    const needle = q.trim().toLowerCase();
    const l = all.filter(
      (e) =>
        (!needle || e.film.title.toLowerCase().includes(needle) || (e.best.director || "").toLowerCase().includes(needle)) &&
        (!format || e.copies.some((c) => c.format === format)) &&
        (!genre || e.film.genre_ids.includes(genre)) &&
        (!dec || decade(e.film.release_date) === dec) &&
        (quick === "tous" ||
          (quick === "jamais" && !seen.has(e.tmdb_id)) ||
          (quick === "scelles" && e.copies.some((c) => c.sealed)) ||
          (quick === "limitees" && isLimited(e)) ||
          (quick === "prets" && e.copies.some((c) => c.lent_to))),
    );
    const cmp: Record<typeof sort, (a: Entry, b: Entry) => number> = {
      realisateur: compareByDirector,
      recent: (a, b) => b.added.localeCompare(a.added),
      numero: (a, b) => a.no - b.no,
      titre: (a, b) => a.film.title.localeCompare(b.film.title, "fr"),
      annee: (a, b) => (b.film.release_date || "").localeCompare(a.film.release_date || ""),
      note: (a, b) => (rated.get(b.tmdb_id) ?? 0) - (rated.get(a.tmdb_id) ?? 0),
    };
    return l.sort(cmp[sort]);
  }, [all, q, format, genre, dec, quick, sort, seen, rated]);

  useEffect(() => setLimit(STEP), [q, format, genre, dec, quick, sort, view, mode]);

  const stats = useMemo(() => {
    if (!all || !items) return null;
    const formats = FORMATS.map((f) => [f.k, items.filter((i) => i.format === f.k).length] as const).filter(([, n]) => n);
    return {
      films: all.length,
      copies: items.length,
      never: all.filter((e) => !seen.has(e.tmdb_id)).length,
      sealed: all.filter((e) => e.copies.some((c) => c.sealed)).length,
      limited: all.filter(isLimited).length,
      lent: all.filter((e) => e.copies.some((c) => c.lent_to)).length,
      formats,
      directors: new Set(all.map((e) => directorIdOf(e) ?? directorName(e)).filter(Boolean)).size,
      decades: [...new Set(all.map((e) => decade(e.film.release_date)).filter(Boolean))].sort((a, b) => +b - +a),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, items, seen]);

  const wantIds = useMemo(() => new Set((wants ?? []).map((w) => w.tmdb_id)), [wants]);
  const entriesOnly = all ?? [];

  const toggleWant = async (m: Movie) => {
    if (!sb || !userId) return;
    const on = wantIds.has(m.id);
    const before = wants;
    setWants((w) =>
      on ? (w ?? []).filter((x) => x.tmdb_id !== m.id) : [{ tmdb_id: m.id, created_at: new Date().toISOString(), films: { title: m.title, release_date: m.release_date ?? null, poster_path: m.poster_path ?? null, genre_ids: m.genre_ids ?? [] } }, ...(w ?? [])],
    );
    try {
      if (on) await removeWant(sb, m.id);
      else await addWant(sb, userId, filmRow(m));
      toast(on ? `« ${m.title} » retiré de tes envies` : `« ${m.title} » ajouté à tes envies`);
    } catch (e) {
      setWants(before);
      toast(`Échec : ${(e as Error).message}`);
    }
  };

  const openFilm = (e: Entry): FilmInput => ({ id: e.tmdb_id, title: e.film.title, release_date: e.film.release_date ?? undefined, poster_path: e.film.poster_path, genre_ids: e.film.genre_ids });
  const onEdit = (e: Entry) => (item: CollectionItem) => setEditing({ film: openFilm(e), item });
  const wantFilm = (w: Want): FilmInput => ({ id: w.tmdb_id, title: w.films?.title ?? "Film", release_date: w.films?.release_date ?? undefined, poster_path: w.films?.poster_path, genre_ids: w.films?.genre_ids });

  // une seule étagère pour tous les formats, dans l'ordre du tri (réalisateur par défaut)
  const shelf = useMemo(() => {
    if (!filtered) return [];
    return filtered.flatMap((e) => e.copies.filter((c) => !format || c.format === format).map((c) => ({ e, c })));
  }, [filtered, format]);

  const newest = all?.length ? all[all.length - 1] : null;
  const hasFilter = !!(q || format || genre || dec || quick !== "tous");
  const QUICKS: { k: Quick; l: string; n?: number; icon?: "off" }[] = [
    { k: "tous", l: "Tous", n: stats?.films },
    { k: "jamais", l: "Jamais vus", n: stats?.never, icon: "off" },
    { k: "scelles", l: "Scellés", n: stats?.sealed },
    { k: "limitees", l: "Éditions limitées", n: stats?.limited },
    ...(stats?.lent ? [{ k: "prets" as Quick, l: "Prêtés", n: stats.lent }] : []),
  ];

  return (
    <>
      <div className="chero">
        {newest?.film.poster_path ? (
          <div className="chero-bg" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(newest.film.poster_path, "w500")} alt="" />
          </div>
        ) : null}
        <div className="chero-top">
          <div>
            <div className="label">Collection physique</div>
            <h1>
              Ma <span>cinémathèque</span>
            </h1>
            <p className="lede">Ce que tu possèdes vraiment : disques, steelbooks, cassettes. Les films que tu as vus, eux, sont dans ton journal.</p>
          </div>
          <div className="btns">
            <button type="button" className="btn primary" onClick={() => setAdding("pick")}>
              <Plus />
              Ajouter un exemplaire
            </button>
            <SharePanel />
          </div>
        </div>
        {stats ? (
          <>
            <dl className="cnums">
              <div>
                <dd>{stats.films.toLocaleString("fr-FR")}</dd>
                <dt className="label">Films</dt>
              </div>
              <div>
                <dd>{stats.copies.toLocaleString("fr-FR")}</dd>
                <dt className="label">Exemplaires</dt>
              </div>
              <div>
                <dd>
                  <EyeOff />
                  {stats.never}
                </dd>
                <dt className="label">Jamais vus</dt>
              </div>
              <div>
                <dd>{stats.directors || "–"}</dd>
                <dt className="label">Réalisateurs</dt>
              </div>
            </dl>
            {stats.formats.length ? (
              <div className="fbar">
                <div className="fbar-bar" aria-hidden="true">
                  {stats.formats.map(([f, n], i) => (
                    <i key={f} style={{ flex: n, opacity: Math.max(0.2, 0.95 - i * 0.2) }} />
                  ))}
                </div>
                <div className="fbar-leg">
                  {stats.formats.map(([f, n], i) => (
                    <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(format === f ? "" : f)}>
                      <i style={{ opacity: Math.max(0.2, 0.95 - i * 0.2) }} />
                      {formatLabel(f)} <b>{n}</b>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="ctool">
        <div className="seg" role="radiogroup" aria-label="Affichage">
          <button type="button" role="radio" aria-checked={mode === "cinematheque"} onClick={() => setMode("cinematheque")}>
            Mes exemplaires
          </button>
          <button type="button" role="radio" aria-checked={mode === "envies"} onClick={() => setMode("envies")}>
            Envies{wants?.length ? ` · ${wants.length}` : ""}
          </button>
        </div>
        {mode === "cinematheque" ? (
          <div className="seg" role="radiogroup" aria-label="Vue">
            <button type="button" role="radio" aria-checked={view === "vitrine"} onClick={() => pickView("vitrine")}>
              Vitrine
            </button>
            <button type="button" role="radio" aria-checked={view === "etagere"} onClick={() => pickView("etagere")}>
              Étagère
            </button>
            <button type="button" role="radio" aria-checked={view === "classeur"} onClick={() => pickView("classeur")}>
              Classeur
            </button>
          </div>
        ) : null}
        {mode === "cinematheque" && view !== "classeur" && stats && stats.films ? (
          <>
            <span className="grow" />
            <div className="qchips">
            {QUICKS.map((c) => (
              <button key={c.k} type="button" className={`chip${quick === c.k ? " on" : ""}`} aria-pressed={quick === c.k} onClick={() => setQuick(c.k)}>
                {c.icon === "off" ? <EyeOff /> : null}
                {c.l} <i style={{ fontStyle: "normal", opacity: 0.6 }}>{c.n}</i>
              </button>
            ))}
            </div>
          </>
        ) : null}
      </div>

      {mode === "cinematheque" && view !== "classeur" && stats && stats.films ? (
        <div className="filterbar cfilters">
          <input className="input search-in" type="search" placeholder="Titre ou cinéaste" aria-label="Filtrer par titre ou cinéaste" value={q} onChange={(e) => setQ(e.target.value)} />
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
              {stats.decades.map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </select>
          </label>
          <label>
            Tri
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="realisateur">Réalisateur</option>
              <option value="recent">Ajout récent</option>
              <option value="numero">Numéro de collection</option>
              <option value="titre">Titre</option>
              <option value="annee">Année</option>
              <option value="note">Ta note</option>
            </select>
          </label>
          {hasFilter ? (
            <button type="button" className="link-btn" onClick={() => (setQ(""), setFormat(""), setGenre(0), setDec(""), setQuick("tous"))}>
              Effacer les filtres
            </button>
          ) : null}
          {filtered ? <span className="count">{filtered.length} films</span> : null}
        </div>
      ) : null}

      {error ? (
        <ErrorLine error={error} />
      ) : mode === "envies" ? (
        !wants ? (
          <Loader text="Chargement de tes envies…" />
        ) : !wants.length ? (
          <div className="empty">
            <p>Aucune envie pour l'instant.</p>
            <p className="note">Une envie, c'est un film que tu voudrais posséder en disque. Ajoute-en depuis une fiche film (menu ⋯) ou depuis les manques d'une série du classeur.</p>
          </div>
        ) : (
          <div className="envies">
            {wants.map((w) => (
              <div key={w.tmdb_id} className="want">
                <a href={`/film/${w.tmdb_id}`}>
                  <Poster path={w.films?.poster_path} title={w.films?.title ?? ""} size="w342" />
                  <h3>{w.films?.title}</h3>
                  <div className="meta">{yearOf({ release_date: w.films?.release_date ?? undefined })}</div>
                </a>
                <div className="want-acts">
                  <button type="button" className="btn primary" onClick={() => setFinding(wantFilm(w))}>
                    Je l'ai trouvé
                  </button>
                  <button type="button" className="btn ghost" onClick={() => toggleWant({ id: w.tmdb_id, title: w.films?.title ?? "Film" })}>
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : !all || !filtered ? (
        <Loader text="Chargement de ta cinémathèque…" />
      ) : view === "classeur" ? (
        <Classeur entries={entriesOnly} wants={wantIds} onWant={toggleWant} openId={openDir} onOpen={openDirector} />
      ) : !all.length ? (
        <div className="empty">
          <p>Ta cinémathèque est vide.</p>
          <p className="note">Ajoute tes DVD, Blu-ray, 4K, steelbooks… avec « Ajouter un exemplaire », ou depuis la fiche d'un film (bouton disque, à côté de ta note).</p>
        </div>
      ) : !filtered.length ? (
        <p className="status">Aucun film ne correspond à ces filtres.</p>
      ) : view === "vitrine" ? (
        <>
          <div className="vitrine">
            {filtered.slice(0, limit).map((e) => (
              <CollectionCard key={e.tmdb_id} entry={e} total={total} seen={seen.has(e.tmdb_id)} rating={rated.get(e.tmdb_id) ?? null} onEdit={onEdit(e)} />
            ))}
          </div>
          {filtered.length > limit ? (
            <div className="more" style={{ marginTop: 36, textAlign: "center" }}>
              <button type="button" className="btn ghost" onClick={() => setLimit(limit + STEP)}>
                Voir plus ({filtered.length - limit})
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <section className="shelf">
          <h2>
            Toute ma cinémathèque <span className="dim">{shelf.length}</span>
          </h2>
          <div className="shelf-row">
            {shelf.map(({ e, c }) => (
              <Spine key={c.id} entry={e} copy={c} seen={seen.has(e.tmdb_id)} />
            ))}
          </div>
        </section>
      )}

      {adding === "pick" ? <PickFilm onClose={() => setAdding(null)} onPick={(m) => setAdding(m)} /> : null}
      {adding && adding !== "pick" ? <CopyDialog film={adding} onClose={() => setAdding(null)} onSaved={loadItems} onNext={() => setAdding("pick")} /> : null}
      {editing ? <CopyDialog film={editing.film} item={editing.item} onClose={() => setEditing(null)} onSaved={loadItems} /> : null}
      {finding ? (
        <CopyDialog
          film={finding}
          onClose={() => setFinding(null)}
          onSaved={() => {
            loadItems();
            if (sb) removeWant(sb, finding.id).then(loadWants, () => {});
            refreshOwned();
          }}
        />
      ) : null}
    </>
  );
}

export default function Page() {
  return (
    <ProfileGate>
      <Collection />
    </ProfileGate>
  );
}
