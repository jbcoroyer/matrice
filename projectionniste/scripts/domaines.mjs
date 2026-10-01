// Vérifie la disponibilité de noms en .com auprès du registre (RDAP de Verisign, gratuit, sans clé).
//   node scripts/domaines.mjs                  → la liste de candidats ci-dessous
//   node scripts/domaines.mjs pelloche cinoche → seulement ces noms
//   node scripts/domaines.mjs --variantes      → aussi get…, …app, …hq, …club, …film
// 404 = non enregistré = libre à l'achat (sauf noms « premium » revendus plus cher : à confirmer chez le registrar).
// Ne prouve rien sur les marques : un nom libre peut quand même être le nom d'une société ou d'une appli.

const CANDIDATS = {
  "Argot du cinéma": ["pelloche", "cinoche", "bobine", "bobino", "clap", "claquette"],
  "Langage de cinéphile": ["horschamp", "contrechamp", "planlarge", "photogramme", "generique", "fondu", "fonduenchaine", "sallesobscure", "salleobscure"],
  "Objets et machines du cinéma": ["kinora", "mutoscope", "bioscope", "vitascope", "lanterna", "praxis", "kinetta", "kinotek", "kinoshelf"],
  "Étagère et collection": ["reelshelf", "filmshelf", "cineshelf", "shelfilm", "spinelist", "spinecast", "cinespine", "dosdisque", "vitrinefilm"],
  "Vu et possédé": ["vupossede", "avuetpossede", "cinevu", "filmvu", "completfilm", "completiste", "complete", "tallyfilm", "seenshelf"],
  "Inventés": ["filmaire", "filmory", "filmario", "reelio", "cineo", "cinelog", "reelog", "filmlog", "cinemo", "cinelume", "lumina", "umbrio", "penumbra", "obscuro"],
};

const variantes = process.argv.includes("--variantes");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((a) => a.toLowerCase().replace(/\.com$/, "").replace(/[^a-z0-9-]/g, ""));
const base = args.length ? { "Ta liste": args } : CANDIDATS;
const noms = (n) => (variantes ? [n, `get${n}`, `${n}app`, `${n}hq`, `${n}club`, `${n}film`] : [n]);

async function rdap(nom) {
  try {
    const r = await fetch(`https://rdap.verisign.com/com/v1/domain/${nom}.com`, { headers: { accept: "application/rdap+json" }, signal: AbortSignal.timeout(15000) });
    if (r.status === 404) return "libre";
    if (r.status === 200) return "pris";
    if (r.status === 429) return "limite";
    return `?${r.status}`;
  } catch {
    return "réseau";
  }
}

// contrôle : un domaine qui existe sûrement doit répondre « pris »
if ((await rdap("google")) !== "pris") {
  console.error("Impossible d'interroger le registre (réseau bloqué ou RDAP indisponible). Réessaie depuis un autre réseau.");
  process.exit(1);
}

const libres = [];
for (const [groupe, liste] of Object.entries(base)) {
  console.log(`\n${groupe}`);
  for (const n of liste.flatMap(noms)) {
    let s = await rdap(n);
    if (s === "limite") {
      await new Promise((r) => setTimeout(r, 4000));
      s = await rdap(n);
    }
    console.log(`  ${s === "libre" ? "✓ LIBRE" : s === "pris" ? "· pris " : "? " + s}  ${n}.com`);
    if (s === "libre") libres.push(n);
    await new Promise((r) => setTimeout(r, 350));
  }
}
console.log(`\n${libres.length} nom(s) libre(s) :\n${libres.map((n) => `  ${n}.com`).join("\n") || "  aucun"}`);
