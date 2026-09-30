// Profil public : seulement ce que chacun a choisi de rendre public (nom, pseudo, bio, avatar,
// top 5, listes publiques, critiques publiques). Jamais les films vus, la watchlist ni le journal privé.
import type { SupabaseClient } from "@supabase/supabase-js";
import { check } from "./supabase";

export type PublicProfile = { id: string; username: string | null; display_name: string | null; bio: string | null; avatar_url: string | null; created_at: string };

const COLS = "id, username, display_name, bio, avatar_url, created_at";

/** Profil par pseudo (ou par identifiant, pour ceux qui n'ont pas encore de pseudo). */
export async function getPublicProfile(sb: SupabaseClient, handle: string): Promise<PublicProfile | null> {
  const h = decodeURIComponent(handle);
  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(h);
  if (!isId && !/^[a-z0-9_]{3,24}$/i.test(h)) return null;
  const q = sb.from("profiles").select(COLS);
  return check(await (isId ? q.eq("id", h) : q.eq("username", h.toLowerCase())).maybeSingle()) as PublicProfile | null;
}

/** Lien vers le profil public d'un membre. */
export const profileHref = (id: string, username: string | null | undefined) => `/u/${username || id}`;

export const memberName = (p: Pick<PublicProfile, "display_name" | "username">) => p.display_name || p.username || "Un cinéphile";
