import { tmdb } from "./tmdb";

type Q = Record<string, string | number>;

export type Mood = { slug: string; k: string; t: string; s: string; q: () => Promise<Q> };

const kw: Record<string, number | ""> = {};
async function keywordId(name: string) {
  if (name in kw) return kw[name];
  const r = await tmdb<{ results?: { id: number; name: string }[] }>("search/keyword", { query: name }).catch(() => null);
  const hit = r?.results?.find((k) => k.name.toLowerCase() === name) || r?.results?.[0];
  return (kw[name] = hit ? hit.id : "");
}
const keywords = async (...names: string[]) => (await Promise.all(names.map(keywordId))).filter(Boolean).join("|");

export const MOODS: Mood[] = [
  {
    slug: "mafia", k: "Crime", t: "Mafia et pègre", s: "Familles, trahisons, ascensions et chutes",
    q: async () => ({ with_keywords: await keywords("mafia", "organized crime", "gangster"), with_genres: "80", without_genres: "16,10751,35", "vote_count.gte": 400, "vote_average.gte": 6.8, sort_by: "vote_count.desc" }),
  },
  {
    slug: "drame", k: "Drame", t: "Un drame qui démolit", s: "Écriture au cordeau, interprétation à vif",
    q: async () => ({ with_genres: "18", without_genres: "35,16,10751,28", "vote_count.gte": 800, "vote_average.gte": 7.5, sort_by: "vote_average.desc" }),
  },
  {
    slug: "animation-japonaise", k: "Animation", t: "Animation japonaise", s: "Kon, Ghibli, Shinkai, Hosoda et au-delà",
    q: async () => ({ with_genres: "16", with_origin_country: "JP", "vote_count.gte": 150, "vote_average.gte": 7, sort_by: "vote_average.desc" }),
  },
  {
    slug: "animation-adulte", k: "Animation", t: "Animation adulte", s: "Loin de la comédie familiale",
    q: async () => ({ with_genres: "16", without_genres: "10751,35", "vote_count.gte": 150, "vote_average.gte": 7, sort_by: "vote_average.desc" }),
  },
  {
    slug: "court-et-tendu", k: "Tension", t: "Court et tendu", s: "Thriller de moins de 1 h 45",
    q: async () => ({ with_genres: "53", without_genres: "35", "with_runtime.lte": 105, "with_runtime.gte": 75, "vote_count.gte": 500, "vote_average.gte": 6.9, sort_by: "vote_average.desc" }),
  },
  {
    slug: "cinema-francais", k: "France", t: "Cinéma français sérieux", s: "Polars, drames, pas de comédie chorale",
    q: async () => ({ with_origin_country: "FR", without_genres: "35,10751,16", "vote_count.gte": 250, "vote_average.gte": 7, sort_by: "vote_average.desc" }),
  },
  {
    slug: "noir-coreen", k: "Corée", t: "Noir coréen", s: "Vengeance, enquêtes, lutte des classes",
    q: async () => ({ with_origin_country: "KR", with_genres: "80|53", "vote_count.gte": 200, "vote_average.gte": 7, sort_by: "vote_average.desc" }),
  },
  {
    slug: "ecole-nordique", k: "Scandinavie", t: "École nordique", s: "Vinterberg et ses voisins",
    q: async () => ({ with_origin_country: "DK|SE|NO|IS|FI", with_genres: "18", without_genres: "10751,16", "vote_count.gte": 150, "vote_average.gte": 7, sort_by: "vote_average.desc" }),
  },
  {
    slug: "science-fiction", k: "Anticipation", t: "Science-fiction cérébrale", s: "Des idées avant les explosions",
    q: async () => ({ with_genres: "878", without_genres: "10751,16,35,28", "vote_count.gte": 600, "vote_average.gte": 7, sort_by: "vote_average.desc" }),
  },
  {
    slug: "pepites", k: "Découverte", t: "Pépites méconnues", s: "Très bien notées, peu vues",
    q: async () => ({ "vote_count.gte": 150, "vote_count.lte": 2500, "vote_average.gte": 7.6, without_genres: "99,10770,10402", sort_by: "vote_average.desc" }),
  },
  {
    slug: "classiques", k: "Patrimoine", t: "Classiques à rattraper", s: "Avant 1980, les incontournables",
    q: async () => ({ "primary_release_date.lte": "1979-12-31", "vote_count.gte": 1500, sort_by: "vote_average.desc" }),
  },
  {
    slug: "documentaires", k: "Réel", t: "Documentaires marquants", s: "Enquêtes, portraits, cinéma du réel",
    q: async () => ({ with_genres: "99", "vote_count.gte": 200, "vote_average.gte": 7.3, sort_by: "vote_average.desc" }),
  },
];

export const moodBySlug = (slug: string) => MOODS.find((m) => m.slug === slug);
