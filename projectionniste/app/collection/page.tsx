"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CollectionCard, Spine } from "@/components/CollectionCard";
import { CopyDialog } from "@/components/CopyDialog";
import { Dots, Plus, Search } from "@/components/icons";
import { PickFilm } from "@/components/PickFilm";
import { useProfile, type FilmInput } from "@/components/ProfileProvider";
import { TitleDuo } from "@/components/TitleDuo";
import { ErrorLine, Loader, ProfileGate } from "@/components/ui";
import {
  addWant,
  backfillExtras,
  conditionLabel,
  directorIdOf,
  directorName,
  formatLabel,
  getShare,
  packagingLabel,
  groupEntries,
  listCollection,
  listWants,
  photoUrl,
  removeWant,
  saveShare,
  type CollectionItem,
  type Entry,
  type Share,
  type Want,
} from "@/lib/collection";
import { filmRow } from "@/lib/db";
import { entriesForFilm } from "@/lib/diary";
import { errorText } from "@/lib/errors";
import { frDate, num1, plural } from "@/lib/format";
import { ARRANGE, compareTitles, matches, parseQuery, planks, type Arrange } from "@/lib/shelf";
import { store } from "@/lib/store";
import { img } from "@/lib/tmdb";

/** Jusqu'à ce nombre de films, tout est présenté de face : pas d'étagère, pas d'outils. */
const ALL_FACING = 12;
/** À partir de ce nombre, on peut choisir comment l'étagère est rangée. */
const ARRANGE_FROM = 30;
const RECENT = 8;
// v2 : l'ordre alphabétique des titres devient le rangement par défaut
const ARRANGE_KEY = "projo.shelfArrange.v2";

const loanDays = (c: CollectionItem) => (c.lent_on ? Math.max(0, Math.round((Date.now() - +new Date(c.lent_on + "T12:00:00")) / 86400000)) : null);
const filmOf = (e: Entry): FilmInput => ({ id: e.tmdb_id, title: e.film.title, release_date: e.film.release_date ?? undefined, poster_path: e.film.poster_path, genre_ids: e.film.genre_ids });

/** Un film présenté de face, dans le cadre de sa matière (noir, argent, or crème). */
function Facing({ e, onOpen }: { e: Entry; onOpen: () => void }) {
  const loaned = e.copies.find((c) => c.lent_to);
  return (
    <button type="button" className={`facing f-${e.finish}`} onClick={onOpen} aria-label={`${e.film.title}, ${plural(e.copies.length, "exemplaire")}`}>
      <span className={`facing-art${loaned ? " loaned" : ""}`}>
        {e.film.poster_path ? <img src={img(e.film.poster_path, "w342")} alt="" loading="lazy" /> : <span className="noimg">{e.film.title}</span>}
        {loaned ? <span className="facing-tag">Prêté</span> : null}
      </span>
      <span className="facing-t">{e.film.title}</span>
      <span className="facing-m">
        {formatLabel(e.best.format)}
        {e.copies.length > 1 ? ` · ${e.copies.length} exemplaires` : ""}
      </span>
    </button>
  );
}

/** Feuille de consultation : on tire le boîtier de l'étagère, la carte sort avec ses exemplaires. */
function FilmSheet({ e, onClose, onEdit, onAddCopy }: { e: Entry; onClose: () => void; onEdit: (c: CollectionItem) => void; onAddCopy: () => void }) {
  const { sb, userId, seen, rated } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  const [last, setLast] = useState<string | null | undefined>(undefined);
  const isSeen = seen.has(e.tmdb_id);
  const rating = rated.get(e.tmdb_id) ?? null;
  const dirId = directorIdOf(e);
  const dir = directorName(e);
  const year = (e.film.release_date || "").slice(0, 4);
  useEffect(() => ref.current?.showModal(), []);
  useEffect(() => {
    if (!isSeen || !sb || !userId) return;
    entriesForFilm(sb, userId, e.tmdb_id).then(
      (l) => setLast(l.map((v) => v.watched_on).filter(Boolean).sort().at(-1) ?? null),
      () => setLast(null),
    );
  }, [isSeen, sb, userId, e.tmdb_id]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onCancel={onClose}
      onClick={(ev) => ev.target === ref.current && ref.current.close()}
    >
      <button type="button" className="sheet-x" aria-label="Fermer" onClick={() => ref.current?.close()}>
        ✕
      </button>
      <div className="sheet-in">
        <div className="sheet-card">
          <CollectionCard entry={e} seen={isSeen} rating={rating} still />
        </div>
        <div className="sheet-info">
          <p className="label">Dans ta collection depuis {frDate(e.added.slice(0, 10), { month: "long", year: "numeric" })}</p>
          <h2 id="sheet-title">
            <Link href={`/film/${e.tmdb_id}`}>
              <TitleDuo title={e.film.title} />
            </Link>
          </h2>
          <p className="sheet-by">
            {dir ? (
              <>
                Un film de {dirId ? <Link href={`/personne/${dirId}`}>{dir}</Link> : <b>{dir}</b>}
                {year ? ` · ${year}` : ""}
              </>
            ) : (
              year
            )}
          </p>

          <ul className="copies">
            {e.copies.map((c) => {
              const photo = sb ? photoUrl(sb, c.photo_path) : null;
              const days = loanDays(c);
              const details = [
                c.edition_no ? `n° ${c.edition_no}${c.edition_of ? ` / ${c.edition_of}` : ""}` : "",
                c.sealed ? "scellé" : conditionLabel(c.condition).toLowerCase(),
                c.acquired_on ? `acquis le ${frDate(c.acquired_on)}` : "",
              ].filter(Boolean);
              return (
                <li key={c.id}>
                  {photo ? <img className="copy-photo" src={photo} alt={`Ton exemplaire de ${e.film.title}`} loading="lazy" /> : null}
                  <div>
                    <p className="copy-main">
                      <b>{formatLabel(c.format)}</b>
                      {[packagingLabel(c.packaging), c.edition, c.publisher].filter(Boolean).map((x) => ` · ${x}`)}
                      {c.support_to_check ? <span className="dim"> · support à vérifier</span> : null}
                    </p>
                    {details.length ? <p className="copy-sub">{details.join(" · ")}</p> : null}
                    {c.lent_to ? (
                      <p className="copy-loan">
                        Prêté à <b>{c.lent_to}</b>
                        {days != null ? ` depuis ${plural(days, "jour")}` : ""}
                      </p>
                    ) : null}
                    {c.notes ? <p className="copy-sub">{c.notes}</p> : null}
                  </div>
                  <button type="button" className="link-btn quiet" onClick={() => onEdit(c)} aria-label={`Modifier l'exemplaire ${formatLabel(c.format)}`}>
                    Modifier
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="row-actions">
            <button type="button" className="btn" onClick={onAddCopy}>
              <Plus />
              Ajouter une autre édition
            </button>
            <Link className="btn ghost" href={`/film/${e.tmdb_id}`}>
              Ouvrir la fiche du film
            </Link>
          </div>

          <p className="sheet-seen">
            {isSeen ? (
              <>
                {last ? `Vu le ${frDate(last)}` : "Vu"}
                {rating ? ` · ta note ${num1(rating)}` : ""}
              </>
            ) : (
              "Pas encore vu"
            )}
          </p>
        </div>
      </div>
    </dialog>
  );
}

/** Partage de la collection : une page publique, sans journal, films vus ni prêts. */
function ShareDialog({ onClose }: { onClose: () => void }) {
  const { sb, userId, toast } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  const [share, setShare] = useState<Share | null | undefined>(undefined);
  useEffect(() => ref.current?.showModal(), []);
  useEffect(() => {
    if (sb && userId) getShare(sb, userId).then(setShare, () => setShare(null));
  }, [sb, userId]);
  const update = async (patch: Partial<Share>) => {
    const before = share;
    setShare((s) => ({ share_code: "", enabled: false, title: null, description: null, show_notes: false, show_condition: true, view_count: 0, ...s, ...patch }));
    try {
      setShare(await saveShare(sb!, userId!, patch));
    } catch (e) {
      setShare(before);
      toast(`Échec : ${errorText(e)}`);
    }
  };
  const url = share?.share_code ? `${location.origin}/c/${share.share_code}` : "";
  return (
    <dialog ref={ref} className="dialog" aria-labelledby="share-title" onClose={onClose} onCancel={onClose}>
      <h2 id="share-title">Partager ma cinémathèque</h2>
      <label className="check">
        <input type="checkbox" checked={!!share?.enabled} onChange={(e) => update({ enabled: e.target.checked })} /> Page publique de ma cinémathèque
      </label>
      {share?.enabled ? (
        <>
          <div className="share-link">
            <input className="input" readOnly aria-label="Lien de la page publique" value={url || "Création du lien…"} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(url).then(() => toast("Lien copié"))}>
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
            Seuls tes exemplaires sont visibles : ni ton journal, ni les films que tu as vus, ni tes prêts.{share.view_count ? ` Vue ${share.view_count} fois.` : ""}
          </p>
        </>
      ) : (
        <p className="note">Désactivé : personne ne peut voir ta cinémathèque.</p>
      )}
      <div className="dialog-actions">
        <span style={{ flex: 1 }} />
        <button type="button" className="btn ghost" onClick={() => ref.current?.close()}>
          Fermer
        </button>
      </div>
    </dialog>
  );
}

/** « Tu cherches » : les disques qu'on voudrait trouver, en liste de brocante. */
function Wanted({ wants, onFound, onRemove, onAdd }: { wants: Want[]; onFound: (w: Want) => void; onRemove: (w: Want) => void; onAdd: () => void }) {
  return (
    <section className="wanted" aria-labelledby="wanted-title">
      <div className="wanted-head">
        <h2 id="wanted-title" className="label">
          Tu cherches{wants.length ? ` · ${wants.length}` : ""}
        </h2>
        <button type="button" className="link-btn quiet" onClick={onAdd}>
          <Plus /> Ajouter un film cherché
        </button>
      </div>
      {wants.length ? (
        <ul>
          {wants.map((w) => (
            <li key={w.tmdb_id}>
              <Link href={`/film/${w.tmdb_id}`} className="wanted-t">
                {w.films?.title}
              </Link>
              <span className="wanted-y">{(w.films?.release_date || "").slice(0, 4)}</span>
              <span className="wanted-dots" aria-hidden="true" />
              <button type="button" className="link-btn" onClick={() => onFound(w)}>
                Je l'ai trouvé
              </button>
              <button type="button" className="link-btn quiet" aria-label={`Ne plus chercher ${w.films?.title ?? "ce film"}`} onClick={() => onRemove(w)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="note">Les disques que tu voudrais trouver : une édition précise, un film qui manque à ton étagère. Ajoute-les ici ou depuis la fiche d'un film.</p>
      )}
    </section>
  );
}

function Collection() {
  const { sb, userId, seen, toast, refreshOwned } = useProfile();
  const [items, setItems] = useState<CollectionItem[] | null>(null);
  const [wants, setWants] = useState<Want[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [q, setQ] = useState("");
  const [arrange, setArrange] = useState<Arrange>("titre");
  const [openId, setOpenId] = useState<number | null>(null);
  const [adding, setAdding] = useState<"pick" | FilmInput | null>(null);
  const [editing, setEditing] = useState<{ film: FilmInput; item: CollectionItem } | null>(null);
  const [finding, setFinding] = useState<FilmInput | null>(null);
  const [pickWant, setPickWant] = useState(false);
  const [sharing, setSharing] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => setArrange(store.get<Arrange>(ARRANGE_KEY, "titre")), []);

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

  // l'adresse suit ce qui est ouvert : ?film=… (feuille) ; le retour du navigateur fonctionne
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(location.search);
      setOpenId(+(p.get("film") || 0) || null);
      // les rayons ont rejoint les parcours
      if (p.get("rayon")) location.replace(`/parcours?p=${p.get("rayon")}`);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  const go = (params: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) p.set(k, String(v));
    const qs = p.toString();
    history.pushState({}, "", qs ? `?${qs}` : location.pathname);
  };
  // on ne revient en arrière que si c'est nous qui avons ouvert la feuille ; arrivé par un lien, on retire juste ?film=
  const pushedFilm = useRef(false);
  const openFilm = (id: number | null) => {
    if (id) {
      go({ film: id });
      pushedFilm.current = true;
    } else if (new URLSearchParams(location.search).get("film")) {
      if (pushedFilm.current) history.back();
      else history.replaceState({}, "", location.pathname);
      pushedFilm.current = false;
    }
    setOpenId(id);
  };

  // anciens exemplaires sans réalisateur : on complète en arrière-plan
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (!sb || !items || filled) return;
    setFilled(true);
    backfillExtras(sb, items, (id, x) => setItems((prev) => prev?.map((i) => (i.tmdb_id === id ? { ...i, ...x, director: x.director ?? "" } : i)) ?? prev));
  }, [sb, items, filled]);

  // ordre alphabétique des titres (articles ignorés), comme dans un bac de vidéothèque
  const all = useMemo(() => (items ? groupEntries(items).sort(compareTitles) : null), [items]);
  const total = all?.length ?? 0;
  const recent = useMemo(() => (all ? all.slice().sort((a, b) => b.added.localeCompare(a.added)).slice(0, RECENT) : []), [all]);
  const query = useMemo(() => parseQuery(q), [q]);
  const searching = !!(query.text || query.labels.length);
  const results = useMemo(() => (all && searching ? all.filter((e) => matches(e, query, seen)) : []), [all, query, searching, seen]);
  const shelf = useMemo(() => (all ? planks(all, total >= ARRANGE_FROM ? arrange : "titre") : []), [all, arrange, total]);
  const loans = useMemo(() => (all ?? []).flatMap((e) => e.copies.filter((c) => c.lent_to).map((c) => ({ e, c }))), [all]);
  const opened = openId && all ? all.find((e) => e.tmdb_id === openId) ?? null : null;

  const pickArrange = (a: Arrange) => {
    setArrange(a);
    store.set(ARRANGE_KEY, a);
  };

  const removeWanted = async (w: Want) => {
    if (!sb) return;
    const before = wants;
    setWants((l) => (l ?? []).filter((x) => x.tmdb_id !== w.tmdb_id));
    try {
      await removeWant(sb, w.tmdb_id);
      toast(`« ${w.films?.title ?? "Film"} » retiré de ce que tu cherches`, () => {
        if (userId) addWant(sb, userId, filmRow({ id: w.tmdb_id, title: w.films?.title ?? "Film", release_date: w.films?.release_date ?? undefined, poster_path: w.films?.poster_path })).then(loadWants);
      });
    } catch (e) {
      setWants(before);
      toast(`Échec : ${errorText(e)}`);
    }
  };
  const toggleWant = async (m: FilmInput) => {
    if (!sb || !userId) return;
    const on = (wants ?? []).some((w) => w.tmdb_id === m.id);
    try {
      if (on) await removeWant(sb, m.id);
      else await addWant(sb, userId, filmRow(m));
      loadWants();
      toast(on ? `« ${m.title} » retiré de ce que tu cherches` : `« ${m.title} » ajouté à ce que tu cherches`);
    } catch (e) {
      toast(`Échec : ${errorText(e)}`);
    }
  };

  const closeMenu = () => menu.current?.removeAttribute("open");

  return (
    <>
      <header className="coll-head">
        {recent[0]?.film.poster_path ? (
          <div className="chero-bg" aria-hidden="true">
            <img src={img(recent[0].film.poster_path, "w500")} alt="" />
          </div>
        ) : null}
        <div>
          <p className="label">Collection physique</p>
          <h1>
            Ma <span>cinémathèque</span>
          </h1>
          {total ? (
            <p className="coll-count">
              {plural(total, "film")}
              {items && items.length > total ? `, ${plural(items.length, "exemplaire")}` : ""}
            </p>
          ) : null}
        </div>
        <div className="coll-acts">
          <button type="button" className="btn primary" onClick={() => setAdding("pick")}>
            <Plus />
            Ajouter
          </button>
          <details className="more-menu" ref={menu} onKeyDown={(e) => e.key === "Escape" && (closeMenu(), menu.current?.querySelector("summary")?.focus())}>
            <summary className="btn icon" aria-label="Plus d'options" title="Plus d'options">
              <Dots />
            </summary>
            <div className="menu">
              <button type="button" onClick={() => (closeMenu(), setSharing(true))}>
                Partager ma cinémathèque
              </button>
              <Link href="/parcours" onClick={closeMenu}>
                Mes parcours
              </Link>
              <button type="button" onClick={() => (closeMenu(), setPickWant(true))}>
                Je cherche un disque
              </button>
            </div>
          </details>
        </div>
      </header>

      {loans.length ? (
        <p className="coll-loans">
          {plural(loans.length, "film prêté", "films prêtés")} :{" "}
          {loans.slice(0, 3).map(({ e, c }, i) => (
            <span key={c.id}>
              {i ? " · " : ""}
              <button type="button" className="link-btn" onClick={() => openFilm(e.tmdb_id)}>
                {e.film.title}
              </button>{" "}
              à {c.lent_to}
              {loanDays(c) != null ? ` (${loanDays(c)} j)` : ""}
            </span>
          ))}
          {loans.length > 3 ? ` et ${loans.length - 3} autres` : ""}
        </p>
      ) : null}

      {error ? (
        <ErrorLine error={error} onRetry={loadItems} />
      ) : !all ? (
        <Loader text="Chargement de ta cinémathèque…" />
      ) : !total ? (
        <section className="coll-empty">
          <div className="empty-shelf" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ height: `${180 + ((i * 37) % 40)}px` }} />
            ))}
          </div>
          <h2>Ton étagère est vide</h2>
          <p className="note">Tes DVD, Blu-ray, 4K, VHS : chaque disque que tu ranges ici prend sa place sur l'étagère.</p>
          <div className="row-actions">
            <button type="button" className="btn primary" onClick={() => setAdding("pick")}>
              <Plus />
              Ajouter mon premier film
            </button>
          </div>
        </section>
      ) : total <= ALL_FACING ? (
        <div className="facing-grid">
          {all
            .slice()
            .sort((a, b) => b.added.localeCompare(a.added))
            .map((e) => (
              <Facing key={e.tmdb_id} e={e} onOpen={() => openFilm(e.tmdb_id)} />
            ))}
        </div>
      ) : (
        <>
          <section aria-labelledby="recent-title">
            <h2 id="recent-title" className="label coll-h">
              Dernières entrées
            </h2>
            <div className="facing-row">
              {recent.map((e) => (
                <Facing key={e.tmdb_id} e={e} onOpen={() => openFilm(e.tmdb_id)} />
              ))}
            </div>
          </section>

          <section className="coll-shelf" aria-labelledby="shelf-title">
            <div className="shelf-tools">
              <h2 id="shelf-title" className="label coll-h">
                L'étagère
              </h2>
              <label className="shelf-search">
                <Search />
                <input
                  type="search"
                  value={q}
                  placeholder="Chercher : titre, cinéaste, 4K, scellé, prêté, pas vu…"
                  aria-label="Chercher dans ma collection"
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
              {total >= ARRANGE_FROM && !searching ? (
                <label className="shelf-arrange">
                  Ranger par
                  <select value={arrange} onChange={(e) => pickArrange(e.target.value as Arrange)}>
                    {ARRANGE.map((a) => (
                      <option key={a.k} value={a.k}>
                        {a.l}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {searching ? (
              <>
                <p className="shelf-found" aria-live="polite">
                  {results.length ? plural(results.length, "film") : "Aucun film"}
                  {query.labels.length ? ` · ${query.labels.join(" · ")}` : ""}
                  {query.text ? ` · « ${query.text} »` : ""}{" "}
                  <button type="button" className="link-btn quiet" onClick={() => setQ("")}>
                    Effacer
                  </button>
                </p>
                <div className="facing-grid">
                  {results.slice(0, 60).map((e) => (
                    <Facing key={e.tmdb_id} e={e} onOpen={() => openFilm(e.tmdb_id)} />
                  ))}
                </div>
              </>
            ) : (
              <>
                {shelf.length > 1 ? (
                  <nav className="shelf-index" aria-label="Aller à">
                    {shelf.map((p) => (
                      <a key={p.key} href={`#planche-${p.key}`}>
                        {p.key === "~" ? "?" : p.key}
                      </a>
                    ))}
                  </nav>
                ) : null}
                <div className="shelf-row">
                  {shelf.map((p) => (
                    <Fragment key={p.key}>
                      {shelf.length > 1 ? (
                        <span className="slot">
                          <span className="divider" id={`planche-${p.key}`} title={p.label}>
                            {p.key === "~" ? "?" : p.key}
                          </span>
                        </span>
                      ) : null}
                      {p.copies.map(({ e, c }) => (
                        <Spine key={c.id} entry={e} copy={c} seen={seen.has(e.tmdb_id)} onOpen={() => openFilm(e.tmdb_id)} />
                      ))}
                    </Fragment>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}

      {wants && wants.length ? (
        <Wanted wants={wants} onFound={(w) => setFinding({ id: w.tmdb_id, title: w.films?.title ?? "Film", release_date: w.films?.release_date ?? undefined, poster_path: w.films?.poster_path })} onRemove={removeWanted} onAdd={() => setPickWant(true)} />
      ) : null}

      {opened ? (
        <FilmSheet
          key={opened.tmdb_id}
          e={opened}
          onClose={() => openFilm(null)}
          onEdit={(c) => setEditing({ film: filmOf(opened), item: c })}
          onAddCopy={() => setAdding(filmOf(opened))}
        />
      ) : null}
      {sharing ? <ShareDialog onClose={() => setSharing(false)} /> : null}
      {adding === "pick" ? <PickFilm onClose={() => setAdding(null)} onPick={(m) => setAdding(m)} /> : null}
      {adding && adding !== "pick" ? <CopyDialog film={adding} onClose={() => setAdding(null)} onSaved={loadItems} onNext={opened ? undefined : () => setAdding("pick")} /> : null}
      {editing ? <CopyDialog film={editing.film} item={editing.item} onClose={() => setEditing(null)} onSaved={loadItems} /> : null}
      {pickWant ? (
        <PickFilm
          title="Quel film cherches-tu ?"
          onClose={() => setPickWant(false)}
          onPick={(m) => {
            setPickWant(false);
            toggleWant(m);
          }}
        />
      ) : null}
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
