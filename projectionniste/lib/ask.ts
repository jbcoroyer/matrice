// « Dis-moi ce que tu veux voir » : une phrase en français devient des critères lisibles
// (« style Martin Scorsese · Mafia · Après 2010 »), puis une recherche TMDB.
// Tout se fait ici, sans service extérieur : vocabulaire du cinéma, années, durées, pays, genres,
// thèmes (mots-clés TMDB) et personnes (recherche TMDB).
import type { Ctx, Idea } from "./discover";
import { personFilms, upcoming } from "./sets";
import { mapLimit, tmdb } from "./tmdb";
import type { Credits, Movie, MovieDetail, Paged, PersonCredits } from "./types";

export type Crit =
  | { k: "person"; mode: "style" | "by"; id: number; name: string }
  | { k: "genre"; id: number; label: string }
  | { k: "keyword"; ids: string; label: string }
  | { k: "country"; codes: string; label: string }
  | { k: "years"; gte?: number; lte?: number; label: string }
  | { k: "runtime"; gte?: number; lte?: number; label: string }
  | { k: "mine"; which: "watchlist" | "owned"; label: string };

export type Parsed = { crits: Crit[]; unknown: string[] };

export const critLabel = (c: Crit) => (c.k === "person" ? (c.mode === "style" ? `Dans le style de ${c.name}` : `De ${c.name}`) : c.label);

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'");

/* ---------- vocabulaire ---------- */

/** Genres TMDB : expressions françaises (repliées, sans accents) → id. Les plus longues d'abord. */
const GENRES: [RegExp, number, string][] = [
  [/\bcomedies? musicales?\b|\bmusicals?\b/, 10402, "Comédie musicale"],
  [/\bscience[- ]fiction\b|\bsf\b|\banticipation\b/, 878, "Science-fiction"],
  [/\bfilms? d'animation\b|\banimation\b|\banimes?\b|\bdessins? animes?\b/, 16, "Animation"],
  [/\bdocumentaires?\b|\bdocus?\b/, 99, "Documentaire"],
  [/\bpolicier\b|\bpolars?\b|\bcriminels?\b|\bfilms? de gangsters?\b/, 80, "Policier"],
  [/\bthrillers?\b|\bsuspense\b|\btendus?\b|\bhaletants?\b/, 53, "Thriller"],
  [/\bhorreur\b|\bepouvante\b|\bflippants?\b|\bqui fait peur\b/, 27, "Horreur"],
  [/\bcomedies?\b|\bdroles?\b|\bmarrants?\b|\bpour rire\b/, 35, "Comédie"],
  [/\bdrames?\b|\bdramatiques?\b|\bemouvants?\b|\btristes?\b/, 18, "Drame"],
  [/\bromances?\b|\bromantiques?\b|\bhistoires? d'amour\b/, 10749, "Romance"],
  [/\baction\b/, 28, "Action"],
  [/\baventures?\b/, 12, "Aventure"],
  [/\bfantastiques?\b|\bfantasy\b/, 14, "Fantastique"],
  [/\bhistoriques?\b|\bfilms? d'epoque\b/, 36, "Histoire"],
  [/\bfilms? de guerre\b|\bguerre\b(?! froide)/, 10752, "Guerre"],
  [/\bwesterns?\b(?! spaghetti)/, 37, "Western"],
  [/\bmysteres?\b|\benigmes?\b/, 9648, "Mystère"],
  [/\bfamilial\b|\ben famille\b|\bpour (les )?enfants\b/, 10751, "En famille"],
];

/** Thèmes : mots français → mots-clés TMDB (en anglais). */
const THEMES: [RegExp, string[], string][] = [
  [/\bmafia\b|\bmafieux\b|\bpegre\b|\bcrime organise\b/, ["mafia", "organized crime"], "Mafia"],
  [/\bgangsters?\b/, ["gangster"], "Gangsters"],
  [/\bvengeance\b|\bse venger\b/, ["revenge"], "Vengeance"],
  [/\bbraquages?\b|\bhold[- ]?ups?\b|\bcambriolages?\b|\bcasse\b/, ["heist"], "Braquage"],
  [/\bvoyages? dans le temps\b/, ["time travel"], "Voyage dans le temps"],
  [/\btueurs? en serie\b/, ["serial killer"], "Tueur en série"],
  [/\bvampires?\b/, ["vampire"], "Vampires"],
  [/\bzombies?\b/, ["zombie"], "Zombies"],
  [/\bprisons?\b|\bevasions?\b/, ["prison"], "Prison"],
  [/\bboxe\b|\bboxeurs?\b/, ["boxing"], "Boxe"],
  [/\bespions?\b|\bespionnage\b/, ["spy"], "Espionnage"],
  [/\bproces\b|\btribunal\b/, ["courtroom"], "Procès"],
  [/\broad[- ]?movies?\b|\bsur la route\b/, ["road movie"], "Road movie"],
  [/\bhuis[- ]clos\b/, ["single location"], "Huis clos"],
  [/\bsurvie\b/, ["survival"], "Survie"],
  [/\bdystopies?\b|\bdystopiques?\b/, ["dystopia"], "Dystopie"],
  [/\brobots?\b|\bintelligence artificielle\b|\bia\b/, ["artificial intelligence", "robot"], "Robots et IA"],
  [/\bextra-?terrestres?\b|\baliens?\b/, ["alien"], "Extraterrestres"],
  [/\benquetes?\b|\benqueteurs?\b|\bdetectives?\b/, ["investigation", "detective"], "Enquête"],
  [/\bcomplots?\b|\bconspirations?\b|\bparanoia\b|\bparanoiaques?\b/, ["conspiracy", "paranoia"], "Complot"],
  [/\bdrogues?\b|\bcartels?\b/, ["drug cartel", "drugs"], "Drogue"],
  [/\bguerre froide\b/, ["cold war"], "Guerre froide"],
  [/\bjazz\b/, ["jazz"], "Jazz"],
  [/\bdanse\b/, ["dance"], "Danse"],
  [/\bcuisine\b|\bgastronomie\b/, ["cooking", "chef"], "Cuisine"],
  [/\bnoel\b/, ["christmas"], "Noël"],
  [/\badolescen(ce|ts?)\b|\bpassage a l'age adulte\b|\bados?\b/, ["coming of age"], "Adolescence"],
  [/\bpremier amour\b/, ["first love"], "Premier amour"],
  [/\brequins?\b/, ["shark"], "Requins"],
  [/\bsamourais?\b|\bsamurais?\b/, ["samurai"], "Samouraïs"],
  [/\barts martiaux\b|\bkung[- ]fu\b/, ["martial arts", "kung fu"], "Arts martiaux"],
  [/\bwesterns? spaghetti\b/, ["spaghetti western"], "Western spaghetti"],
  [/\bcyberpunk\b/, ["cyberpunk"], "Cyberpunk"],
  [/\bpost[- ]?apocalyptiques?\b|\bfin du monde\b/, ["post-apocalyptic future"], "Post-apocalyptique"],
  [/\bcatastrophes?\b/, ["disaster"], "Catastrophe"],
  [/\bbiopics?\b|\bbiographies?\b/, ["biography"], "Biographie"],
  [/\bhistoires? vraies?\b|\bfaits? reels?\b/, ["based on true story"], "Histoire vraie"],
  [/\bneo[- ]?noir\b/, ["neo-noir"], "Néo-noir"],
  [/\bfilms? noirs?\b/, ["film noir"], "Film noir"],
  [/\bsport\b/, ["sports"], "Sport"],
  [/\bfootball\b/, ["football (soccer)"], "Football"],
  [/\bmer\b|\bocean\b|\bbateaux?\b/, ["ocean", "sea"], "La mer"],
  [/\bespace\b|\bastronautes?\b/, ["space", "astronaut"], "L'espace"],
  [/\bsorcieres?\b|\bmagie\b/, ["witch", "magic"], "Magie"],
  [/\bfantomes?\b|\bhantees?\b|\bhantises?\b/, ["ghost", "haunted house"], "Fantômes"],
];

/** Pays d'origine (adjectifs au masculin, féminin, pluriel). */
const COUNTRIES: [RegExp, string, string][] = [
  [/\bfrancais(es?)?\b|\bde france\b/, "FR", "Français"],
  [/\bcoreen(nes?|s)?\b|\bde coree\b/, "KR", "Coréen"],
  [/\bjaponais(es?)?\b|\bdu japon\b/, "JP", "Japonais"],
  [/\bitalien(nes?|s)?\b|\bd'italie\b/, "IT", "Italien"],
  [/\bamericain(es?|s)?\b|\bhollywoodiens?\b/, "US", "Américain"],
  [/\bbritanniques?\b|\banglais(es?)?\b/, "GB", "Britannique"],
  [/\bespagnol(es?|s)?\b/, "ES", "Espagnol"],
  [/\ballemand(es?|s)?\b/, "DE", "Allemand"],
  [/\biranien(nes?|s)?\b/, "IR", "Iranien"],
  [/\bchinois(es?)?\b/, "CN", "Chinois"],
  [/\bhong[- ]?kongais(es?)?\b|\bde hong[- ]kong\b/, "HK", "Hong Kong"],
  [/\btaiwanais(es?)?\b/, "TW", "Taïwanais"],
  [/\bnordiques?\b|\bscandinaves?\b/, "DK|SE|NO|IS|FI", "Nordique"],
  [/\bdanois(es?)?\b/, "DK", "Danois"],
  [/\bsuedois(es?)?\b/, "SE", "Suédois"],
  [/\bnorvegien(nes?|s)?\b/, "NO", "Norvégien"],
  [/\bmexicain(es?|s)?\b/, "MX", "Mexicain"],
  [/\bindien(nes?|s)?\b|\bbollywood\b/, "IN", "Indien"],
  [/\bbresilien(nes?|s)?\b/, "BR", "Brésilien"],
  [/\bargentin(es?|s)?\b/, "AR", "Argentin"],
  [/\bbelges?\b/, "BE", "Belge"],
  [/\brusses?\b|\bsovietiques?\b/, "RU|SU", "Russe"],
  [/\bthailandais(es?)?\b/, "TH", "Thaïlandais"],
  [/\bturcs?\b|\bturques?\b/, "TR", "Turc"],
  [/\bpolonais(es?)?\b/, "PL", "Polonais"],
  [/\bcanadien(nes?|s)?\b|\bquebecois(es?)?\b/, "CA", "Canadien"],
  [/\baustralien(nes?|s)?\b/, "AU", "Australien"],
  [/\bgrecs?\b|\bgrecques?\b/, "GR", "Grec"],
  [/\bportugais(es?)?\b/, "PT", "Portugais"],
  [/\bisraelien(nes?|s)?\b/, "IL", "Israélien"],
];

/** Mots qui n'apportent rien à la recherche. */
const FILLER =
  /\b(je|j'|veux|voudrais|aimerais|cherche|cherches|trouve|trouver|montre|moi|donne|propose|un|une|des|du|le|la|les|l'|d'|de|film|films|truc|quelque chose|chose|qui|que|soit|est|sont|plutot|bien|bon|bons|tres|vraiment|un peu|pour|ce|soir|voir|regarder|stp|s'il te plait|realise|realises|sorti|sortis|tourne|tournes|et|ou|avec|par|en|pas|vu|jamais|deja|avoir|a)\b/g;

/** « dans le style de Scorsese » → style ; « de Scorsese », « réalisé par… », « avec… » → ses films. */
const STYLE = /^(?:.*?\b)?(?:dans le style de|dans le style d'|style|a la maniere de|a la facon de|facon|dans la veine de|comme|qui ressemble a|un peu comme|genre)\s+(.+)$/;
const BY = /^(?:.*?\b)?(?:realise par|un film de|film de|de|par|avec)\s+(.+)$/;

type Hit = { id: number; name: string; popularity?: number; known_for_department?: string };

async function findPerson(q: string): Promise<Hit | null> {
  const name = q.replace(FILLER, " ").replace(/\s+/g, " ").trim();
  if (name.length < 3) return null;
  const r = await tmdb<Paged<Hit>>("search/person", { query: name }).catch(() => null);
  const words = name.split(" ");
  // le nom trouvé doit contenir tous les mots tapés (« scorsese » → Martin Scorsese)
  const hit = (r?.results ?? []).find((p) => words.every((w) => fold(p.name).includes(w)));
  return hit ?? null;
}

const kwCache = new Map<string, number | null>();
async function keywordId(name: string) {
  if (kwCache.has(name)) return kwCache.get(name)!;
  const r = await tmdb<Paged<{ id: number; name: string }>>("search/keyword", { query: name }).catch(() => null);
  const id = r?.results?.find((k) => k.name.toLowerCase() === name)?.id ?? null;
  kwCache.set(name, id);
  return id;
}

/** Comprend une phrase : chaque critère reconnu est retiré du texte ; le reste sert à chercher une personne. */
export async function parseAsk(text: string): Promise<Parsed> {
  let t = " " + fold(text) + " ";
  const crits: Crit[] = [];
  const take = (re: RegExp) => {
    const m = t.match(re);
    if (m) t = t.replace(re, " , ");
    return m;
  };
  const year = new Date().getFullYear();

  // époques
  let m: RegExpMatchArray | null;
  if ((m = take(/\bentre\s+(\d{4})\s+et\s+(\d{4})\b/))) crits.push({ k: "years", gte: +m[1], lte: +m[2], label: `${m[1]}–${m[2]}` });
  else if ((m = take(/\b(?:apres|depuis|post|a partir de)\s+(?:l'an\s+)?(\d{4})\b/))) crits.push({ k: "years", gte: +m[1], label: `Après ${m[1]}` });
  else if ((m = take(/\bavant\s+(?:l'an\s+)?(\d{4})\b/))) crits.push({ k: "years", lte: +m[1] - 1, label: `Avant ${m[1]}` });
  else if ((m = take(/\b(?:annees|annee)\s+((?:19|20)\d0)\b/))) crits.push({ k: "years", gte: +m[1], lte: +m[1] + 9, label: `Années ${m[1]}` });
  else if ((m = take(/\b(?:annees|annee)\s+(\d)0\b|\b(\d)0'?s\b/))) {
    const d = +(m[1] ?? m[2]);
    const y = d <= 2 ? 2000 + d * 10 : 1900 + d * 10;
    crits.push({ k: "years", gte: y, lte: y + 9, label: `Années ${y}` });
  } else if ((m = take(/\b(?:en|de)\s+((?:19|20)\d\d)\b/))) crits.push({ k: "years", gte: +m[1], lte: +m[1], label: m[1] });
  else if (take(/\brecents?\b|\brecentes?\b|\brecemment\b|\bnouveaux?\b|\bnouvelles?\b/)) crits.push({ k: "years", gte: year - 4, label: "Récent" });
  else if (take(/\bclassiques?\b|\bvieux\b|\banciens?\b/)) crits.push({ k: "years", lte: 1979, label: "Classique (avant 1980)" });

  // durée
  if ((m = take(/\bmoins de\s+(\d)\s*h\s*(\d{1,2})?\b/))) {
    const lte = +m[1] * 60 + +(m[2] || 0);
    crits.push({ k: "runtime", lte, label: `Moins de ${m[1]} h${m[2] ? " " + m[2] : ""}` });
  } else if ((m = take(/\bmoins de\s+(\d{2,3})\s*(?:min|minutes)\b/))) crits.push({ k: "runtime", lte: +m[1], label: `Moins de ${m[1]} min` });
  else if (take(/\bcourts?\b|\bcourtes?\b|\bpas trop long\b/)) crits.push({ k: "runtime", lte: 100, label: "Court (moins de 1 h 40)" });
  else if (take(/\blongs?\b|\bfleuves?\b/)) crits.push({ k: "runtime", gte: 150, label: "Long (plus de 2 h 30)" });

  // chez toi
  if (take(/\b(?:dans )?ma watchlist\b|\bwatchlist\b/)) crits.push({ k: "mine", which: "watchlist", label: "Dans ta watchlist" });
  else if (take(/\bpossedes?\b|\b(?:dans )?ma collection\b|\bque j'ai\b|\bmes (?:dvd|blu-?rays?)\b/)) crits.push({ k: "mine", which: "owned", label: "Dans ta collection" });

  // thèmes (avant les genres : « western spaghetti », « guerre froide »)
  for (const [re, names, label] of THEMES) {
    if (!re.test(t)) continue;
    const ids = (await Promise.all(names.map(keywordId))).filter((x): x is number => !!x);
    if (!ids.length) continue;
    take(re);
    crits.push({ k: "keyword", ids: ids.join("|"), label });
  }
  for (const [re, id, label] of GENRES) if (take(re) && !crits.some((c) => c.k === "genre" && c.id === id)) crits.push({ k: "genre", id, label });
  for (const [re, codes, label] of COUNTRIES) if (take(re)) crits.push({ k: "country", codes, label });

  // personnes, morceau par morceau
  const unknown: string[] = [];
  for (const raw of t.split(/[,;.!?]|\s+et\s+|\s+mais\s+/)) {
    const seg = raw.replace(/\s+/g, " ").trim();
    if (!seg || !seg.replace(FILLER, "").trim()) continue;
    let s = seg.match(STYLE);
    if (s) {
      const p = await findPerson(s[1]);
      if (p) {
        crits.push({ k: "person", mode: "style", id: p.id, name: p.name });
        continue;
      }
    }
    s = seg.match(BY);
    const p = await findPerson(s ? s[1] : seg);
    if (p) crits.push({ k: "person", mode: "by", id: p.id, name: p.name });
    else unknown.push(seg.replace(FILLER, " ").replace(/\s+/g, " ").trim());
  }
  return { crits, unknown: unknown.filter(Boolean) };
}

/* ---------- recherche ---------- */

export type AskResult = { ideas: Idea[]; own: { id: number; title: string; year: string; name: string } | null; relaxed: string[] };

type Detail = MovieDetail & { credits?: Credits; keywords?: { keywords: { id: number }[] } };

const why = (crits: Crit[]) => `Correspond à : ${crits.map((c) => critLabel(c).toLowerCase()).join(", ")}.`;

function discoverParams(crits: Crit[]) {
  const q: Record<string, string | number> = { sort_by: "vote_count.desc", "vote_count.gte": 120, "vote_average.gte": 6.2, without_genres: "10770", include_adult: "false" };
  const genres = crits.flatMap((c) => (c.k === "genre" ? [c.id] : []));
  if (genres.length) q.with_genres = genres.join(",");
  const kws = crits.flatMap((c) => (c.k === "keyword" ? [c.ids] : []));
  if (kws.length) q.with_keywords = kws.join(",");
  const countries = crits.flatMap((c) => (c.k === "country" ? [c.codes] : []));
  if (countries.length) {
    q.with_origin_country = countries.join("|");
    q["vote_count.gte"] = 30;
  }
  for (const c of crits) {
    if (c.k === "years") {
      if (c.gte) q["primary_release_date.gte"] = `${c.gte}-01-01`;
      if (c.lte) q["primary_release_date.lte"] = `${c.lte}-12-31`;
      if (c.lte && c.lte < 1980) q["vote_count.gte"] = Math.min(+q["vote_count.gte"], 60);
    }
    if (c.k === "runtime") {
      if (c.lte) q["with_runtime.lte"] = c.lte;
      if (c.gte) q["with_runtime.gte"] = c.gte;
      else q["with_runtime.gte"] = 60;
    }
  }
  const by = crits.filter((c) => c.k === "person" && c.mode === "by") as Extract<Crit, { k: "person" }>[];
  if (by.length) {
    q.with_people = by.map((p) => p.id).join(",");
    q["vote_count.gte"] = 10;
  }
  return q;
}

async function discover(q: Record<string, string | number>, pages = 2): Promise<Movie[]> {
  const res = await Promise.all(Array.from({ length: pages }, (_, i) => tmdb<Paged<Movie>>("discover/movie", { ...q, page: i + 1 }).catch(() => null)));
  return [...new Map(res.flatMap((r) => r?.results ?? []).map((m) => [m.id, m])).values()];
}

/** Les films d'une personne qui servent à définir son « style » (les plus connus). */
async function signature(personId: number) {
  const c = await tmdb<PersonCredits>(`person/${personId}/movie_credits`);
  let films = personFilms(c, "director");
  if (films.length < 3) films = personFilms(c, "main");
  return [...new Map(films.filter((m) => !upcoming(m)).map((m) => [m.id, m])).values()].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
}

/** Vérifie un film de ta watchlist ou de ta collection contre les critères (fiche TMDB complète). */
function matches(d: Detail, crits: Crit[]) {
  const y = +(d.release_date || "0").slice(0, 4);
  const gs = new Set((d.genres ?? []).map((g) => g.id));
  const countries = new Set((d.production_countries ?? []).map((c) => c.iso_3166_1));
  const people = new Set([...(d.credits?.crew ?? []).filter((p) => p.job === "Director").map((p) => p.id), ...(d.credits?.cast ?? []).slice(0, 10).map((p) => p.id)]);
  const kws = new Set((d.keywords?.keywords ?? []).map((k) => k.id));
  return crits.every((c) => {
    if (c.k === "genre") return gs.has(c.id);
    if (c.k === "country") return c.codes.split("|").some((x) => countries.has(x));
    if (c.k === "years") return (!c.gte || y >= c.gte) && (!c.lte || y <= c.lte);
    if (c.k === "runtime") return !!d.runtime && (!c.lte || d.runtime <= c.lte) && (!c.gte || d.runtime >= c.gte);
    if (c.k === "person") return c.mode === "style" || people.has(c.id);
    if (c.k === "keyword") return c.ids.split("|").some((x) => kws.has(+x));
    return true;
  });
}

const MAX = 5;

/** Cherche des films pour une liste de critères : les tiens d'abord si tu l'as demandé, sinon TMDB. */
export async function runAsk(crits: Crit[], ctx: Ctx): Promise<AskResult> {
  const fresh = (id: number) => !ctx.seen.has(id);
  const mine = crits.find((c) => c.k === "mine") as Extract<Crit, { k: "mine" }> | undefined;
  const rest = crits.filter((c) => c.k !== "mine");

  // dans ta watchlist ou ta collection : chaque film est vérifié sur sa fiche
  if (mine) {
    const ids = (mine.which === "watchlist" ? [...ctx.watchlist] : [...ctx.owned.keys()]).filter(fresh).slice(0, 60);
    const needKw = rest.some((c) => c.k === "keyword");
    const det = await mapLimit(ids, 4, (id) => tmdb<Detail>(`movie/${id}`, { append_to_response: needKw ? "credits,keywords" : "credits" }).catch(() => null));
    const ok = det.filter((d): d is Detail => !!d && matches(d, rest));
    const where = mine.which === "watchlist" ? "Dans ta watchlist" : "Dans ta collection";
    return { ideas: ok.slice(0, MAX).map((d) => ({ id: d.id, why: rest.length ? `${where}. ${why(rest)}` : `${where}, pas encore vu.` })), own: null, relaxed: [] };
  }

  const style = rest.find((c) => c.k === "person" && c.mode === "style") as Extract<Crit, { k: "person" }> | undefined;
  const filters = rest.filter((c) => c !== style);
  const relaxed: string[] = [];

  if (!style) {
    let list = (await discover(discoverParams(filters))).filter((m) => fresh(m.id));
    // trop précis : on lâche d'abord les thèmes, puis les genres
    for (const drop of ["keyword", "genre"] as const) {
      if (list.length >= 3 || !filters.some((c) => c.k === drop)) continue;
      const loose = filters.filter((c) => c.k !== drop);
      relaxed.push(...filters.filter((c) => c.k === drop).map((c) => critLabel(c)));
      list = (await discover(discoverParams(loose))).filter((m) => fresh(m.id));
    }
    return { ideas: list.slice(0, MAX).map((m) => ({ id: m.id, why: filters.length ? why(filters) : "Parmi les films les plus vus." })), own: null, relaxed };
  }

  // « dans le style de… » : ses films les plus connus servent de repères ; on cherche ce que TMDB en rapproche
  const sig = await signature(style.id);
  const own = new Set(sig.map((m) => m.id));
  const pool = new Map<number, { m: Movie; from: string[] }>();
  await mapLimit(sig.slice(0, 5), 3, async (f) => {
    const r = await tmdb<Paged<Movie>>(`movie/${f.id}/recommendations`).catch(() => null);
    for (const m of r?.results ?? []) {
      const e = pool.get(m.id) ?? { m, from: [] };
      e.from.push(f.title);
      pool.set(m.id, e);
    }
  });
  // son genre principal, si la phrase n'en donne pas
  const counts = new Map<number, number>();
  for (const f of sig.slice(0, 8)) for (const g of f.genre_ids ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  const styleGenre = top.find((g) => g !== 18) ?? top[0];
  const withGenre = filters.some((c) => c.k === "genre") || !styleGenre ? filters : [...filters, { k: "genre" as const, id: styleGenre, label: "" }];

  let list = await discover(discoverParams(withGenre));
  if (list.filter((m) => !own.has(m.id) && fresh(m.id)).length < 3 && withGenre !== filters) list = await discover(discoverParams(filters));
  if (list.filter((m) => !own.has(m.id) && fresh(m.id)).length < 3 && filters.some((c) => c.k === "keyword")) {
    relaxed.push(...filters.filter((c) => c.k === "keyword").map((c) => critLabel(c)));
    list = await discover(discoverParams([...filters.filter((c) => c.k !== "keyword"), ...(styleGenre ? [{ k: "genre" as const, id: styleGenre, label: "" }] : [])]));
  }
  // ce que ses films « appellent » passe devant
  const ranked = [...list].sort((a, b) => (pool.has(b.id) ? 1 : 0) - (pool.has(a.id) ? 1 : 0));
  // sans autre critère, les rapprochements suffisent
  if (!filters.length) for (const e of pool.values()) if (!ranked.some((m) => m.id === e.m.id)) ranked.push(e.m);
  const ideas = ranked
    .filter((m) => fresh(m.id) && !own.has(m.id))
    .slice(0, MAX)
    .map((m) => {
      const from = pool.get(m.id)?.from;
      return { id: m.id, why: from ? `Proche de ${from.slice(0, 2).join(" et ")}${filters.length ? `. ${why(filters)}` : "."}` : filters.length ? why(filters) : `Dans l'esprit de ${style.name}.` };
    });

  // et ses propres films qui répondent à la demande
  const byHim = await discover(discoverParams([...filters, { k: "person", mode: "by", id: style.id, name: style.name }]), 1).catch(() => []);
  const hit = byHim.find((m) => fresh(m.id));
  return { ideas, own: hit ? { id: hit.id, title: hit.title, year: (hit.release_date || "").slice(0, 4), name: style.name } : null, relaxed };
}
