// Messages d'erreur en français : jamais de texte technique anglais devant l'utilisateur.

export const GENERIC_ERROR = "Une erreur est survenue. Réessaie dans un instant.";
export const NETWORK_ERROR = "Connexion impossible. Vérifie ta connexion internet, puis réessaie.";
export const SESSION_ERROR = "Ta session a expiré. Reconnecte-toi pour continuer.";

/** Vrai si le texte est déjà écrit pour l'utilisateur (nos propres messages). */
export const looksFrench = (m: string) => /[àâçéèêëîïôûùüÿœ]/i.test(m) || /^(Impossible|Échec|Envoi|Cette|Cet |Ce |Le |La |Les |Un |Une |Mot de passe|Email|Trop|Aucun|Il )/.test(m);

/** Traduit les erreurs connues (réseau, session, droits, doublons, délai) ; null si on ne les reconnaît pas. */
export function frenchMessage(message: string, code = ""): string | null {
  const s = `${message} ${code}`;
  if (/jwt expired|invalid jwt|PGRST30[1-3]|auth session missing|not authenticated|refresh token|session (has )?expired|session_not_found/i.test(s)) return SESSION_ERROR;
  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|network error/i.test(s) || /\bECONN[A-Z]+\b|\bENOTFOUND\b/.test(s)) return NETWORK_ERROR;
  if (/row-level security|violates row|42501|permission denied/i.test(s)) return "Tu n'as pas le droit de faire cette action.";
  if (/duplicate key|23505|already exists/i.test(s)) return "Cet élément existe déjà.";
  if (/timeout|timed out|57014|statement timeout/i.test(s)) return "Le serveur met trop de temps à répondre. Réessaie dans un instant.";
  if (/payload too large|413/i.test(s)) return "Le fichier est trop volumineux.";
  return null;
}

/** Texte à montrer pour n'importe quelle erreur attrapée. */
export function errorText(e: unknown): string {
  const any = e as { message?: unknown; code?: unknown; name?: unknown } | null | undefined;
  const msg = typeof e === "string" ? e : typeof any?.message === "string" ? any.message : "";
  const mapped = frenchMessage(msg, typeof any?.code === "string" ? any.code : "");
  if (mapped) return mapped;
  if (!msg) return GENERIC_ERROR;
  if (any?.name === "DbError" || any?.name === "ApiError" || looksFrench(msg)) return msg;
  return GENERIC_ERROR;
}
