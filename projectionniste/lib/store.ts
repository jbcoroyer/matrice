// localStorage tolérant : navigation privée, quota plein ou stockage bloqué ne cassent rien.
export const store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : (JSON.parse(v) as T);
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

export const KEYS = {
  profile: "projo.v2.profile",
  prefs: "projo.v2.prefs",
  recs: "projo.v2.recs",
  imdbMap: "projo.v2.imdbmap",
  titleMap: "projo.v2.titlemap",
  theme: "projo.theme",
} as const;
