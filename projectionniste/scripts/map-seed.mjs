// Pré-calcule la correspondance IMDb → TMDB du profil de départ (public/seed.json),
// pour que la première ouverture du site soit instantanée.
// Usage : TMDB_TOKEN=… npm run seed   (ou avec TMDB_TOKEN dans .env.local)
import fs from "node:fs";

const file = new URL("../public/seed.json", import.meta.url);
const envFile = new URL("../.env.local", import.meta.url);
if (!process.env.TMDB_TOKEN && fs.existsSync(envFile)) {
  const m = fs.readFileSync(envFile, "utf8").match(/^TMDB_TOKEN=(.*)$/m);
  if (m) process.env.TMDB_TOKEN = m[1].trim();
}
const token = process.env.TMDB_TOKEN;
if (!token) {
  console.error("TMDB_TOKEN manquant (variable d'environnement ou .env.local).");
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(file, "utf8"));
const bearer = token.startsWith("eyJ");

async function find(tt) {
  const url = `https://api.themoviedb.org/3/find/${tt}?external_source=imdb_id&language=fr-FR${bearer ? "" : `&api_key=${token}`}`;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: bearer ? { Authorization: `Bearer ${token}` } : {} });
    if (r.status === 429) {
      await new Promise((s) => setTimeout(s, 1000 * (i + 1)));
      continue;
    }
    if (!r.ok) throw new Error(`TMDB ${r.status} pour ${tt}`);
    const m = (await r.json()).movie_results?.[0];
    return m ? [m.id, m.title] : null;
  }
  return null;
}

const all = [...new Set([...seed.seen, ...seed.watchlist, ...Object.keys(seed.rated)])];
const map = {};
let done = 0;
const queue = all.slice();
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const tt = queue.shift();
      map[tt] = await find(tt);
      if (++done % 50 === 0) console.log(`${done} / ${all.length}`);
    }
  }),
);

const toId = (tt) => map[tt]?.[0] ?? null;
const titles = {};
for (const tt of all) if (map[tt]) titles[map[tt][0]] = map[tt][1];
const rated = {};
for (const [tt, r] of Object.entries(seed.rated)) if (toId(tt)) rated[toId(tt)] = r;
seed.tmdb = {
  seen: [...new Set([...seed.seen.map(toId), ...Object.keys(rated).map(Number)].filter(Boolean))],
  rated,
  watchlist: seed.watchlist.map(toId).filter(Boolean),
  titles,
};
fs.writeFileSync(file, JSON.stringify(seed));
const miss = all.filter((tt) => !map[tt]);
console.log(`OK : ${all.length - miss.length} films reliés, ${miss.length} introuvables${miss.length ? ` (${miss.slice(0, 5).join(", ")}…)` : ""}.`);
