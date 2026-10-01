// Collection : exemplaires possédés (collection_items) et partage public (collection_shares).
import { errorText } from "./errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureFilms } from "./db";
import { check } from "./supabase";
import { tmdb } from "./tmdb";
import type { FilmRow, MovieDetail } from "./types";

/** Supports physiques proposés à la saisie. */
export const FORMATS = [
  { k: "4k", l: "4K UHD", c: "4K" },
  { k: "bluray", l: "Blu-ray", c: "BD" },
  { k: "dvd", l: "DVD", c: "DVD" },
  { k: "vhs", l: "VHS", c: "VHS" },
  { k: "laserdisc", l: "LaserDisc", c: "LD" },
] as const;
/** « numerique » n'est plus proposé (pas physique) mais d'anciens exemplaires peuvent l'avoir. */
const LEGACY = [{ k: "numerique", l: "Numérique", c: "NUM" }] as const;
export type Format = (typeof FORMATS)[number]["k"] | "numerique";

/** L'édition, indépendante du support : un 4K peut être un steelbook. */
export const PACKAGINGS = [
  { k: "standard", l: "Standard" },
  { k: "steelbook", l: "Steelbook" },
  { k: "coffret", l: "Coffret" },
  { k: "mediabook", l: "Mediabook" },
  { k: "digibook", l: "Digibook" },
  { k: "collector", l: "Collector" },
] as const;
export type Packaging = (typeof PACKAGINGS)[number]["k"];
export const packagingLabel = (k: string | null | undefined) => (k && k !== "standard" ? PACKAGINGS.find((p) => p.k === k)?.l ?? "" : "");
export const formatLabel = (k: string) => [...FORMATS, ...LEGACY].find((f) => f.k === k)?.l ?? k;
/** Languette d'une affiche possédée : « 4K UHD », « BLU-RAY ×2 »… */
export const ownedLabel = (formats: string[]) => `${formatLabel(formats[0]).toUpperCase()}${formats.length > 1 ? ` ×${formats.length}` : ""}`;
/** Code court du médaillon de la carte (4K, BD, DVD…). */
export const formatCode = (k: string) => [...FORMATS, ...LEGACY].find((f) => f.k === k)?.c ?? k.toUpperCase().slice(0, 3);

export const CONDITIONS = [
  { k: "neuf", l: "Neuf" },
  { k: "tres_bon", l: "Très bon état" },
  { k: "bon", l: "Bon état" },
  { k: "use", l: "Usé" },
] as const;
export const conditionLabel = (k: string | null) => CONDITIONS.find((c) => c.k === k)?.l ?? "";

/** Éditeurs courants, proposés à la saisie. */
export const PUBLISHERS = ["Criterion", "Carlotta", "Studiocanal", "Arrow", "Wild Side", "Potemkine", "Le Chat qui fume", "Metropolitan", "Warner", "Universal", "Sony", "Disney", "Pathé", "Gaumont", "MK2", "Eureka", "Second Sight", "Shout! Factory", "Kino Lorber"];

/** Finition d'une carte : le cadre dit ce qu'est l'exemplaire (noir, argent, or crème). */
export type Finish = "std" | "premium" | "collector";
const FINISH_RANK: Record<Finish, number> = { std: 0, premium: 1, collector: 2 };
export function finishOf(c: Pick<CollectionItem, "format" | "packaging" | "edition" | "edition_no">): Finish {
  const ed = (c.edition || "").toLowerCase();
  if (c.packaging === "collector" || c.packaging === "coffret" || c.edition_no || /collector|limit|numérot|numerot|coffret/.test(ed)) return "collector";
  if (c.format === "4k" || (c.packaging && c.packaging !== "standard") || /steelbook|criterion|carlotta|digibook|mediabook/.test(ed)) return "premium";
  return "std";
}
/** L'exemplaire le plus prestigieux d'un film : c'est lui qui donne son cadre à la carte. */
export function bestCopy(copies: CollectionItem[]): CollectionItem {
  return copies.slice().sort((a, b) => FINISH_RANK[finishOf(b)] - FINISH_RANK[finishOf(a)])[0];
}
/** Texte du sceau d'édition (haut de la carte), s'il y a lieu. */
export function sealText(c: Pick<CollectionItem, "packaging" | "edition" | "publisher">): string {
  return c.edition || c.publisher || packagingLabel(c.packaging);
}

export type FilmMeta = { title: string; release_date: string | null; poster_path: string | null; genre_ids: number[] };

export type CollectionItem = {
  id: string;
  tmdb_id: number;
  format: Format;
  packaging: Packaging;
  /** support deviné lors de la séparation support / édition : à confirmer */
  support_to_check: boolean;
  edition: string | null;
  publisher: string | null;
  edition_no: number | null;
  edition_of: number | null;
  sealed: boolean;
  condition: string | null;
  notes: string | null;
  acquired_on: string | null;
  lent_to: string | null;
  lent_on: string | null;
  photo_path: string | null;
  director: string | null;
  director_id: number | null;
  created_at: string;
  films: FilmMeta | null;
};

export type ItemInput = Pick<CollectionItem, "format" | "packaging" | "edition" | "publisher" | "edition_no" | "edition_of" | "sealed" | "condition" | "notes" | "acquired_on" | "lent_to" | "lent_on" | "photo_path">;

const COLS =
  "id, tmdb_id, format, packaging, support_to_check, edition, publisher, edition_no, edition_of, sealed, condition, notes, acquired_on, lent_to, lent_on, photo_path, director, director_id, created_at, films(title, release_date, poster_path, genre_ids)";

export async function listCollection(sb: SupabaseClient): Promise<CollectionItem[]> {
  const out: CollectionItem[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(await sb.from("collection_items").select(COLS).order("created_at", { ascending: true }).order("id").range(from, from + 999)) as unknown as CollectionItem[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export async function itemsForFilm(sb: SupabaseClient, tmdbId: number): Promise<CollectionItem[]> {
  return check(await sb.from("collection_items").select(COLS).eq("tmdb_id", tmdbId).order("created_at")) as unknown as CollectionItem[];
}

/** Formats possédés par film (léger : sert à marquer les affiches dans toute l'appli). */
export async function listOwned(sb: SupabaseClient): Promise<Map<number, Format[]>> {
  const by = new Map<number, Format[]>();
  for (let from = 0; ; from += 1000) {
    const rows = check(await sb.from("collection_items").select("tmdb_id, format").order("id").range(from, from + 999)) as { tmdb_id: number; format: Format }[];
    for (const r of rows) by.set(r.tmdb_id, [...(by.get(r.tmdb_id) ?? []), r.format]);
    if (rows.length < 1000) break;
  }
  const rank = (f: Format) => ["4k", "bluray", "dvd", "laserdisc", "vhs", "numerique"].indexOf(f);
  for (const [k, v] of by) by.set(k, v.sort((a, b) => rank(a) - rank(b)));
  return by;
}

/**
 * Réalisateur d'un film, lu sur TMDB et rangé avec l'exemplaire (ligne de la carte, étagère par
 * réalisateur). Il reste sur l'exemplaire : la table films est partagée et n'accepte que des ajouts.
 */
export type FilmExtra = Pick<CollectionItem, "director" | "director_id">;
export async function fetchExtra(tmdbId: number): Promise<FilmExtra> {
  const d = await tmdb<MovieDetail>(`movie/${tmdbId}`, { append_to_response: "credits" });
  const dir = d.credits?.crew?.find((c) => c.job === "Director");
  return { director: dir?.name ?? null, director_id: dir?.id ?? null };
}

/** Complète les exemplaires qui n'ont pas encore de réalisateur (anciens ajouts). */
export async function backfillExtras(sb: SupabaseClient, items: CollectionItem[], onItem: (tmdbId: number, x: FilmExtra) => void) {
  const ids = [...new Set(items.filter((i) => i.director == null).map((i) => i.tmdb_id))].slice(0, 200);
  let next = 0;
  const work = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        const x = await fetchExtra(id);
        // même sans réalisateur trouvé, on note une chaîne vide pour ne pas redemander à chaque visite
        await sb.from("collection_items").update({ ...x, director: x.director ?? "" }).eq("tmdb_id", id);
        onItem(id, x);
      } catch {
        /* on réessaiera à la prochaine visite */
      }
    }
  };
  await Promise.all([work(), work(), work()]);
}

export async function saveItem(sb: SupabaseClient, userId: string, film: FilmRow, input: ItemInput, id?: string, extra?: FilmExtra | null) {
  await ensureFilms(sb, [film]);
  const row = {
    format: input.format,
    packaging: input.packaging,
    support_to_check: false,
    edition: input.edition?.trim() || null,
    publisher: input.publisher?.trim() || null,
    edition_no: input.edition_no || null,
    edition_of: input.edition_of || null,
    sealed: !!input.sealed,
    condition: input.condition || null,
    notes: input.notes?.trim() || null,
    acquired_on: input.acquired_on || null,
    lent_to: input.lent_to?.trim() || null,
    lent_on: input.lent_to?.trim() ? input.lent_on || null : null,
    photo_path: input.photo_path || null,
  };
  check(id ? await sb.from("collection_items").update(row).eq("id", id) : await sb.from("collection_items").insert({ ...row, ...(extra ?? {}), user_id: userId, tmdb_id: film.tmdb_id }));
}

export async function deleteItem(sb: SupabaseClient, id: string) {
  check(await sb.from("collection_items").delete().eq("id", id));
}

/** Remet un exemplaire supprimé (« Annuler »), avec son identifiant et sa date d'ajout d'origine. */
export async function restoreItem(sb: SupabaseClient, userId: string, i: CollectionItem) {
  const { films: _films, ...row } = i;
  check(await sb.from("collection_items").insert({ ...row, user_id: userId }));
}

/* ---------- photos d'exemplaires ---------- */

const BUCKET = "collection-photos";
export const photoUrl = (sb: SupabaseClient, path: string | null) => (path ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null);

/** Réduit la photo (1200 px max, JPEG) avant l'envoi : les photos de téléphone font plusieurs Mo. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error("Cette photo ne peut pas être lue. Essaie une image JPEG ou PNG.");
  });
  const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Photo illisible."))), "image/jpeg", 0.85));
}

export async function uploadPhoto(sb: SupabaseClient, userId: string, file: File): Promise<string> {
  const blob = await shrink(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(`Envoi de la photo impossible : ${errorText(error)}`);
  return path;
}

/** Supprime toutes les photos d'exemplaires d'un compte (avant la suppression du compte). */
export async function removeAllPhotos(sb: SupabaseClient, userId: string) {
  for (let i = 0; i < 20; i++) {
    const { data } = await sb.storage.from(BUCKET).list(userId, { limit: 100 });
    const names = (data ?? []).map((f) => `${userId}/${f.name}`);
    if (!names.length) return;
    await sb.storage.from(BUCKET).remove(names);
    if (names.length < 100) return;
  }
}

export async function removePhoto(sb: SupabaseClient, path: string) {
  await sb.storage.from(BUCKET).remove([path]);
}

/* ---------- envies (films à acquérir en physique) ---------- */

export type Want = { tmdb_id: number; created_at: string; films: FilmMeta | null };

export async function listWants(sb: SupabaseClient): Promise<Want[]> {
  return check(await sb.from("collection_wants").select("tmdb_id, created_at, films(title, release_date, poster_path, genre_ids)").order("created_at", { ascending: false })) as unknown as Want[];
}
export async function addWant(sb: SupabaseClient, userId: string, film: FilmRow) {
  await ensureFilms(sb, [film]);
  check(await sb.from("collection_wants").upsert({ user_id: userId, tmdb_id: film.tmdb_id }, { onConflict: "user_id,tmdb_id", ignoreDuplicates: true }));
}
export async function isWanted(sb: SupabaseClient, tmdbId: number): Promise<boolean> {
  const r = check(await sb.from("collection_wants").select("tmdb_id").eq("tmdb_id", tmdbId).maybeSingle());
  return !!r;
}
export async function removeWant(sb: SupabaseClient, tmdbId: number) {
  check(await sb.from("collection_wants").delete().eq("tmdb_id", tmdbId));
}

/** Un film de la collection, avec tous ses exemplaires. */
export type Entry = {
  tmdb_id: number;
  film: FilmMeta;
  copies: CollectionItem[];
  best: CollectionItem;
  finish: Finish;
  /** rang d'entrée dans la collection (1 = le plus ancien) */
  no: number;
  added: string;
};

export function groupEntries(items: CollectionItem[]): Entry[] {
  const by = new Map<number, CollectionItem[]>();
  for (const it of items) if (it.films) by.set(it.tmdb_id, [...(by.get(it.tmdb_id) ?? []), it]);
  const list = [...by.entries()].map(([tmdb_id, copies]) => ({ tmdb_id, film: copies[0].films!, copies, best: bestCopy(copies), added: copies.reduce((a, c) => (c.created_at < a ? c.created_at : a), copies[0].created_at) }));
  list.sort((a, b) => a.added.localeCompare(b.added));
  return list.map((e, i) => ({ ...e, finish: finishOf(e.best), no: i + 1 }));
}

/* ---------- partage public ---------- */

export type Share = {
  share_code: string;
  enabled: boolean;
  title: string | null;
  description: string | null;
  show_notes: boolean;
  show_condition: boolean;
  view_count: number;
};

export async function getShare(sb: SupabaseClient, userId: string): Promise<Share | null> {
  return check(
    await sb.from("collection_shares").select("share_code, enabled, title, description, show_notes, show_condition, view_count").eq("user_id", userId).maybeSingle(),
  ) as Share | null;
}

export async function saveShare(sb: SupabaseClient, userId: string, patch: Partial<Omit<Share, "share_code" | "view_count">>): Promise<Share> {
  return check(
    await sb
      .from("collection_shares")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
      .select("share_code, enabled, title, description, show_notes, show_condition, view_count")
      .single(),
  ) as Share;
}

export type PublicItem = {
  title: string | null;
  description: string | null;
  owner_name: string | null;
  tmdb_id: number;
  film_title: string;
  release_date: string | null;
  poster_path: string | null;
  genre_ids: number[];
  format: Format;
  packaging: Packaging;
  edition: string | null;
  publisher: string | null;
  edition_no: number | null;
  edition_of: number | null;
  sealed: boolean;
  director: string | null;
  condition: string | null;
  notes: string | null;
  photo_path: string | null;
  created_at: string;
};

export async function getPublicCollection(sb: SupabaseClient, code: string): Promise<PublicItem[]> {
  const rows = check(await sb.rpc("get_public_collection", { code })) as PublicItem[];
  sb.rpc("count_collection_view", { code }).then(() => {});
  return rows;
}

/* ---------- tri et regroupement par réalisateur ---------- */

const surnameOf = (name: string) => name.trim().split(/\s+/).at(-1) ?? name;
export const directorName = (e: Entry) => (e.copies.find((c) => c.director)?.director ?? "").trim();
export const directorIdOf = (e: Entry) => e.copies.find((c) => c.director_id)?.director_id ?? null;

/** Nom de famille (dernier mot), puis prénom, puis date de sortie ; les films sans réalisateur connu en dernier. */
export function compareByDirector(a: Entry, b: Entry): number {
  const da = directorName(a);
  const db = directorName(b);
  if (!da !== !db) return da ? -1 : 1;
  const opt = { sensitivity: "base" } as const;
  return (
    surnameOf(da).localeCompare(surnameOf(db), "fr", opt) ||
    da.localeCompare(db, "fr", opt) ||
    (a.film.release_date || "").localeCompare(b.film.release_date || "") ||
    a.film.title.localeCompare(b.film.title, "fr")
  );
}
