"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { currentAccount, EMPTY_STATE, type Account, filmRow, loadFilmStates, loadProfile, markKnown, saveFilmState, updateProfile } from "@/lib/db";
import { predict, type Prediction } from "@/lib/predict";
import { derive, type Derived } from "@/lib/profile";
import { clearRecs } from "@/lib/recs";
import { KEYS, store } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { Credits, FilmState, Movie, Profile, Settings } from "@/lib/types";

/** signedOut : personne n'est connecté ; guest : ancienne session anonyme, à transformer en compte */
type Status = "loading" | "ready" | "error" | "signedOut" | "guest";

type Toast = { id: number; text: string; undo?: () => void };

/** Film tel qu'on le reçoit des pages (au minimum un id et un titre). */
export type FilmInput = Partial<Movie> & { id: number; title: string };

type Ctx = Derived & {
  status: Status;
  error: string | null;
  profile: Profile | null;
  sb: SupabaseClient | null;
  userId: string | null;
  account: Account | null;
  setAccount: (a: Account) => void;
  /** aucun film enregistré : on propose l'import Letterboxd */
  empty: boolean;
  states: Map<number, FilmState>;
  predict: (m: Movie, credits?: Credits | null) => Prediction;
  retry: () => void;
  reload: () => Promise<void>;
  toggleWatchlist: (m: FilmInput) => void;
  toggleFavorite: (m: FilmInput) => void;
  markSeen: (m: FilmInput, rating?: number) => void;
  unmarkSeen: (m: FilmInput) => void;
  toggleHidden: (m: FilmInput) => void;
  /** modifie l'état d'un film (utilisé par le journal) ; message facultatif avec annulation */
  setFilmState: (m: FilmInput, patch: Partial<FilmState>, message?: string) => void;
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
  const sb = supabase();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const userId = account?.id ?? null;
  const accountRef = useRef(account);
  accountRef.current = account;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [states, setStates] = useState<Map<number, FilmState>>(new Map());
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [attempt, setAttempt] = useState(0);
  const statesRef = useRef(states);
  statesRef.current = states;

  const toast = useCallback((text: string, undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const loadAll = useCallback(
    async (uid: string) => {
      const [p, f] = await Promise.all([loadProfile(sb!, uid), loadFilmStates(sb!)]);
      markKnown(f.states.keys());
      setProfile(p);
      setStates(f.states);
      setTitles(f.titles);
    },
    [sb],
  );

  useEffect(() => {
    if (!sb) {
      setError("Supabase n'est pas configuré : ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans .env.local, puis relance le serveur.");
      setStatus("error");
      return;
    }
    let alive = true;
    setStatus("loading");
    setError(null);
    (async () => {
      const acc = await currentAccount(sb);
      if (!alive) return;
      setAccount(acc);
      if (!acc) {
        setProfile(null);
        setStates(new Map());
        setTitles({});
        setStatus("signedOut");
        return;
      }
      await loadAll(acc.id);
      if (alive) setStatus(acc.anonymous ? "guest" : "ready");
    })().catch((e: Error) => {
      if (!alive) return;
      setError(e.message || "Impossible de charger tes données.");
      setStatus("error");
    });
    return () => {
      alive = false;
    };
  }, [sb, attempt, loadAll]);

  useEffect(() => {
    if (!sb) return;
    // on recharge seulement si l'utilisateur change vraiment (SIGNED_IN est aussi émis au retour sur l'onglet)
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      const u = session?.user;
      const cur = accountRef.current;
      const changed = (u?.id ?? null) !== (cur?.id ?? null) || (!!u && (u.email || null) !== (cur?.email ?? null));
      if (changed) setAttempt((x) => x + 1);
    });
    return () => data.subscription.unsubscribe();
  }, [sb]);

  const reload = useCallback(async () => {
    if (!userId) return;
    clearRecs();
    await loadAll(userId);
  }, [userId, loadAll]);

  /** Modifie l'état d'un film : affichage immédiat, enregistrement en arrière-plan, retour arrière si échec. */
  const patchFilm = useCallback(
    (m: FilmInput, patch: Partial<FilmState>, message?: string) => {
      if (!sb || !userId) return;
      const before = statesRef.current.get(m.id) ?? EMPTY_STATE;
      const apply = (next: FilmState) =>
        setStates((prev) => {
          const map = new Map(prev);
          map.set(m.id, next);
          return map;
        });
      apply({ ...before, ...patch });
      setTitles((t) => (t[m.id] ? t : { ...t, [m.id]: m.title }));
      const revert = () => {
        apply(before);
        const keys = Object.keys(patch) as (keyof FilmState)[];
        saveFilmState(sb, userId, filmRow(m), Object.fromEntries(keys.map((k) => [k, before[k]]))).catch(() => {});
      };
      saveFilmState(sb, userId, filmRow(m), patch).then(
        () => message && toast(message, revert),
        (e: Error) => {
          apply(before);
          toast(`Échec de l'enregistrement : ${e.message}`);
        },
      );
    },
    [sb, userId, toast],
  );

  const cur = (id: number) => statesRef.current.get(id) ?? EMPTY_STATE;

  const toggleWatchlist = useCallback(
    (m: FilmInput) => {
      const on = !cur(m.id).watchlist;
      patchFilm(m, { watchlist: on }, on ? `« ${m.title} » ajouté à ta watchlist` : `« ${m.title} » retiré de ta watchlist`);
    },
    [patchFilm],
  );
  const toggleFavorite = useCallback(
    (m: FilmInput) => {
      const on = !cur(m.id).favorite;
      patchFilm(m, { favorite: on }, on ? `« ${m.title} » ajouté à tes favoris` : `« ${m.title} » retiré de tes favoris`);
    },
    [patchFilm],
  );
  const markSeen = useCallback(
    (m: FilmInput, rating?: number) => {
      const patch: Partial<FilmState> = { watched: true, watchlist: false };
      if (rating) patch.rating = rating;
      patchFilm(m, patch, rating ? `« ${m.title} » noté ${String(rating).replace(".", ",")}/5` : `« ${m.title} » marqué comme vu`);
    },
    [patchFilm],
  );
  const unmarkSeen = useCallback((m: FilmInput) => patchFilm(m, { watched: false, rating: null }, `« ${m.title} » n'est plus marqué comme vu`), [patchFilm]);
  const toggleHidden = useCallback(
    (m: FilmInput) => {
      const on = !cur(m.id).hidden;
      patchFilm(m, { hidden: on }, on ? `« ${m.title} » ne sera plus proposé` : `« ${m.title} » revient dans tes sélections`);
    },
    [patchFilm],
  );

  const derived = useMemo(() => derive(profile, states, titles), [profile, states, titles]);

  const value = useMemo<Ctx>(
    () => ({
      ...derived,
      status,
      error,
      profile,
      sb,
      userId,
      account,
      setAccount,
      empty: status === "ready" && states.size === 0,
      states,
      predict: (m, credits) => (profile ? predict(m, profile.aff, profile.mu, credits) : { v: 0, why: [] }),
      retry: () => setAttempt((a) => a + 1),
      reload,
      toggleWatchlist,
      toggleFavorite,
      markSeen,
      unmarkSeen,
      toggleHidden,
      setFilmState: patchFilm,
      toast,
      toasts,
      dismissToast,
    }),
    [derived, status, error, profile, sb, userId, account, states, reload, toggleWatchlist, toggleFavorite, markSeen, unmarkSeen, toggleHidden, patchFilm, toast, toasts, dismissToast],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
