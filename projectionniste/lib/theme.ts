"use client";

import { useEffect, useState } from "react";
import { KEYS, store } from "./store";

export type ThemeMode = "dark" | "light" | "system";

/** Applique un mode : sombre (par défaut), clair, ou selon l'appareil. */
function apply(m: ThemeMode) {
  const light = m === "light" || (m === "system" && matchMedia("(prefers-color-scheme: light)").matches);
  if (light) document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
}

/** Thème mémorisé dans le navigateur ; Filmable est pensé sombre d'abord. */
export function useTheme(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>("dark");
  useEffect(() => {
    const t = store.get<string | null>(KEYS.theme, null);
    setMode(t === "light" || t === "system" ? t : "dark");
  }, []);
  const set = (m: ThemeMode) => {
    apply(m);
    if (m === "dark") store.del(KEYS.theme);
    else store.set(KEYS.theme, m);
    setMode(m);
  };
  return [mode, set];
}
