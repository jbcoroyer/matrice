import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { frenchMessage, GENERIC_ERROR, looksFrench } from "./errors";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** Émis quand le serveur refuse le jeton d'un utilisateur connecté (401) : la session a expiré. */
export const SESSION_EVENT = "projo:session-expired";

const fetchWatch: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  // les erreurs de l'authentification elle-même (mauvais mot de passe…) ne signifient pas « session expirée »
  if (res.status === 401 && !url.includes("/auth/v1/")) window.dispatchEvent(new Event(SESSION_EVENT));
  return res;
};

/** Client navigateur (session conservée dans le localStorage). null si non configuré. */
export function supabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "projo.auth" }, global: { fetch: fetchWatch } });
  return client;
}

export class DbError extends Error {
  name = "DbError";
}

/** Lève une erreur lisible si Supabase en renvoie une. */
export function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new DbError(humanize(res.error));
  return res.data;
}

function humanize(e: { message: string; code?: string }) {
  if (/anonymous sign-ins are disabled/i.test(e.message))
    return "Les connexions anonymes sont désactivées sur Supabase : Authentication → Sign In / Providers → « Allow anonymous sign-ins ».";
  if (e.code === "42P01" || /relation .* does not exist|schema cache/i.test(e.message))
    return "Les tables Supabase n'existent pas encore : exécute les scripts de supabase/migrations dans le SQL Editor.";
  if (e.code === "42703" || /column .* does not exist/i.test(e.message))
    return "La base n'est pas à jour : exécute le dernier script de supabase/migrations dans le SQL Editor.";
  if (/fetch|network/i.test(e.message)) return "Supabase ne répond pas. Vérifie ta connexion.";
  return frenchMessage(e.message, e.code) ?? (looksFrench(e.message) ? e.message : GENERIC_ERROR);
}

/** Découpe un tableau en paquets (les insertions massives passent par paquets de 500). */
export function chunks<T>(arr: T[], n = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
