// Comptes : transformer la session anonyme en compte, se connecter, se déconnecter.
import type { SupabaseClient } from "@supabase/supabase-js";
import { accountOf, type Account } from "./db";
import { DbError } from "./supabase";

function authError(e: { message: string; code?: string }): never {
  const m = e.message;
  if (/invalid login credentials/i.test(m)) throw new DbError("Email ou mot de passe incorrect.");
  if (/already (been )?registered|already exists|email_exists/i.test(m + (e.code || "")))
    throw new DbError("Un compte existe déjà avec cet email : connecte-toi plutôt.");
  if (/password should be at least|weak/i.test(m)) throw new DbError("Mot de passe trop court (8 caractères minimum).");
  if (/email not confirmed/i.test(m)) throw new DbError("Email pas encore confirmé : clique sur le lien reçu par email.");
  if (/rate limit|too many/i.test(m)) throw new DbError("Trop de tentatives : réessaie dans quelques minutes.");
  if (/invalid.*email|unable to validate email/i.test(m)) throw new DbError("Adresse email invalide.");
  throw new DbError(m);
}

/**
 * Transforme la session anonyme en compte : toutes les données déjà saisies sont conservées.
 * Si Supabase exige une confirmation, l'email reste « en attente » jusqu'au clic sur le lien.
 */
export async function createAccount(sb: SupabaseClient, email: string, password: string): Promise<Account> {
  if (password.length < 8) throw new DbError("Mot de passe trop court (8 caractères minimum).");
  const { data, error } = await sb.auth.updateUser({ email: email.trim(), password }, { emailRedirectTo: location.origin + "/compte" });
  if (error) authError(error);
  return accountOf(data.user!);
}

/** Inscription. Renvoie "confirm" si Supabase attend la confirmation par email. */
export async function signUp(sb: SupabaseClient, email: string, password: string): Promise<"ok" | "confirm"> {
  if (password.length < 8) throw new DbError("Mot de passe trop court (8 caractères minimum).");
  const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin + "/decouvrir" } });
  if (error) authError(error);
  // email déjà utilisé : Supabase renvoie un utilisateur sans identité, sans erreur
  if (data.user && !data.session && data.user.identities && data.user.identities.length === 0)
    throw new DbError("Un compte existe déjà avec cet email : connecte-toi plutôt.");
  return data.session ? "ok" : "confirm";
}

export async function signIn(sb: SupabaseClient, email: string, password: string) {
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) authError(error);
}

export async function signOut(sb: SupabaseClient) {
  await sb.auth.signOut();
}

export async function sendReset(sb: SupabaseClient, email: string) {
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + "/compte?reset=1" });
  if (error) authError(error);
}

export async function setPassword(sb: SupabaseClient, password: string) {
  if (password.length < 8) throw new DbError("Mot de passe trop court (8 caractères minimum).");
  const { error } = await sb.auth.updateUser({ password });
  if (error) authError(error);
}
