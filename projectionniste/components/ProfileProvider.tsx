"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { predict, type Prediction } from "@/lib/predict";
import { derive, EMPTY_PREFS, loadPrefs, loadSeedProfile, loadStoredProfile, savePrefs, saveProfile, type Derived, type Progress } from "@/lib/profile";
import { clearRecs } from "@/lib/recs";
import { KEYS, store } from "@/lib/store";
import type { Credits, Movie, Prefs, Profile } from "@/lib/types";

type Status = "loading" | "mapping" | "ready" | "error";

type Toast = { id: number; text: string; undo?: () => void };

type Ctx = Derived & {
  status: Status;
  progress: Progress | null;
  error: string | null;
  profile: Profile | null;
  prefs: Prefs;
  predict: (m: Movie, credits?: Credits | null) => Prediction;
  retry: () => void;
  setProfile: (p: Profile) => void;
  resetToSeed: () => void;
  updatePrefs: (fn: (p: Prefs) => Prefs) => void;
  toggleWatchlist: (m: Pick<Movie, "id" | "title">) => void;
  markSeen: (m: Pick<Movie, "id" | "title">, rating?: number) => void;
  unmarkSeen: (id: number) => void;
  toggleHidden: (m: Pick<Movie, "id" | "title">) => void;
  toast: (text: string, undo?: () => void) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
};

const ProfileContext = createContext<Ctx | null>(null);

export function useProfile() {
  const c = useContext(ProfileContext);
  if (!c) throw new Error("useProfile doit être utilisé dans <ProfileProvider>.");
  return c;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(EMPTY_PREFS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [attempt, setAttempt] = useState(0);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    let alive = true;
    setPrefs(loadPrefs());
    const stored = loadStoredProfile();
    if (stored) {
      setProfileState(stored);
      setStatus("ready");
      return;
    }
    setStatus("mapping");
    setError(null);
    loadSeedProfile((p) => alive && setProgress(p))
      .then((p) => {
        if (!alive) return;
        saveProfile(p);
        setProfileState(p);
        setStatus("ready");
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message || "Impossible de lire l'historique.");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const derived = useMemo(() => derive(profile, prefs), [profile, prefs]);

  const updatePrefs = useCallback((fn: (p: Prefs) => Prefs) => {
    const next = fn(prefsRef.current);
    prefsRef.current = next;
    setPrefs(next);
    savePrefs(next);
  }, []);

  const toast = useCallback((text: string, undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const withTitle = (p: Prefs, m: Pick<Movie, "id" | "title">) => (m.title ? { ...p.titles, [m.id]: m.title } : p.titles);

  const toggleWatchlist = useCallback(
    (m: Pick<Movie, "id" | "title">) => {
      const before = prefsRef.current;
      const inList = derive(profile, before).watchlist.has(m.id);
      updatePrefs((p) =>
        inList
          ? { ...p, wlAdd: p.wlAdd.filter((x) => x !== m.id), wlDel: [...new Set([...p.wlDel, m.id])] }
          : { ...p, wlDel: p.wlDel.filter((x) => x !== m.id), wlAdd: [...new Set([...p.wlAdd, m.id])], titles: withTitle(p, m) },
      );
      toast(inList ? `« ${m.title} » retiré de ta watchlist` : `« ${m.title} » ajouté à ta watchlist`, () => updatePrefs(() => before));
    },
    [profile, toast, updatePrefs],
  );

  const markSeen = useCallback(
    (m: Pick<Movie, "id" | "title">, rating = 0) => {
      const before = prefsRef.current;
      updatePrefs((p) => ({ ...p, seen: { ...p.seen, [m.id]: rating }, titles: withTitle(p, m) }));
      toast(rating ? `« ${m.title} » noté ${String(rating).replace(".", ",")}/5` : `« ${m.title} » marqué comme vu`, () => updatePrefs(() => before));
    },
    [toast, updatePrefs],
  );

  const unmarkSeen = useCallback(
    (id: number) => {
      const before = prefsRef.current;
      updatePrefs((p) => {
        const seen = { ...p.seen };
        delete seen[id];
        return { ...p, seen };
      });
      toast(`« ${before.titles[id] || "Ce film"} » n'est plus marqué comme vu`, () => updatePrefs(() => before));
    },
    [toast, updatePrefs],
  );

  const toggleHidden = useCallback(
    (m: Pick<Movie, "id" | "title">) => {
      const before = prefsRef.current;
      const hidden = before.hidden.includes(m.id);
      updatePrefs((p) => ({ ...p, hidden: hidden ? p.hidden.filter((x) => x !== m.id) : [...p.hidden, m.id], titles: withTitle(p, m) }));
      toast(hidden ? `« ${m.title} » revient dans tes sélections` : `« ${m.title} » ne sera plus proposé`, () => updatePrefs(() => before));
    },
    [toast, updatePrefs],
  );

  const setProfile = useCallback((p: Profile) => {
    saveProfile(p);
    clearRecs();
    setProfileState(p);
    setStatus("ready");
  }, []);

  const resetToSeed = useCallback(() => {
    store.del(KEYS.profile);
    clearRecs();
    setProfileState(null);
    setAttempt((a) => a + 1);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...derived,
      status,
      progress,
      error,
      profile,
      prefs,
      predict: (m, credits) => (profile ? predict(m, profile.aff, profile.mu, credits) : { v: 0, why: [] }),
      retry: () => setAttempt((a) => a + 1),
      setProfile,
      resetToSeed,
      updatePrefs,
      toggleWatchlist,
      markSeen,
      unmarkSeen,
      toggleHidden,
      toast,
      toasts,
      dismissToast,
    }),
    [derived, status, progress, error, profile, prefs, setProfile, resetToSeed, updatePrefs, toggleWatchlist, markSeen, unmarkSeen, toggleHidden, toast, toasts, dismissToast],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
