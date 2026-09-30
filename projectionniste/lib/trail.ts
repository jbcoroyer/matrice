// Le fil d'une exploration : les derniers films, cinéastes et ensembles ouverts dans cet onglet.
// Découvrir le propose pour reprendre là où on en était. Rien n'est envoyé nulle part.

export type Step = { href: string; label: string; at: number };

const KEY = "projo.trail";
const MAX = 6;
/** Au-delà, l'exploration est considérée comme finie. */
const FRESH = 3 * 3600_000;

function read(): Step[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]") as Step[];
  } catch {
    return [];
  }
}

export function markStep(href: string, label: string) {
  const list = read().filter((s) => s.href !== href);
  list.push({ href, label, at: Date.now() });
  try {
    sessionStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {}
}

export function trail(): Step[] {
  const list = read();
  const last = list[list.length - 1];
  return last && Date.now() - last.at < FRESH ? list : [];
}

export function clearTrail() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
