// Limite de débit en mémoire, par adresse IP : protège le quota TMDB contre les abus.
// Chaque instance du serveur a son propre compteur (suffisant pour une bêta ; pour une grosse audience,
// on branchera un compteur partagé ou le pare-feu de l'hébergeur).

type Slot = { n: number; reset: number };
const slots = new Map<string, Slot>();

/** Autorise `max` appels par fenêtre de `windowMs` pour une clé ; renvoie sinon le délai d'attente en secondes. */
export function hit(key: string, max: number, windowMs = 60_000): { ok: true } | { ok: false; retry: number } {
  const now = Date.now();
  if (slots.size > 5000) for (const [k, s] of slots) if (s.reset < now) slots.delete(k);
  let s = slots.get(key);
  if (!s || s.reset < now) {
    s = { n: 0, reset: now + windowMs };
    slots.set(key, s);
  }
  s.n++;
  return s.n > max ? { ok: false, retry: Math.max(1, Math.ceil((s.reset - now) / 1000)) } : { ok: true };
}

export function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "inconnu";
}
