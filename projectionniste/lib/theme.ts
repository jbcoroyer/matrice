"use client";

import { useEffect, useState } from "react";
import { KEYS, store } from "./store";

export type ThemeMode = "system" | "light" | "dark";

/** Thème : système (par défaut), clair ou sombre, mémorisé dans le navigateur. */
export function useTheme(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>("system");
  useEffect(() => {
    const t = store.get<string | null>(KEYS.theme, null);
    setMode(t === "light" || t === "dark" ? t : "system");
  }, []);
  const set = (m: ThemeMode) => {
    if (m === "system") {
      delete document.documentElement.dataset.theme;
      store.del(KEYS.theme);
    } else {
      document.documentElement.dataset.theme = m;
      store.set(KEYS.theme, m);
    }
    setMode(m);
  };
  return [mode, set];
}
