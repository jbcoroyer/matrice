"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { loadWatchlistFilms } from "./db";
import { mapLimit, tmdb } from "./tmdb";
import type { Movie, Ranked } from "./types";

export type Async<T> = { data?: T; error: unknown; loading: boolean; reload: () => void };

/** Lance une tâche asynchrone quand ses dépendances changent ; ignore les réponses périmées. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], enabled = true): Async<T> {
  const [state, setState] = useState<{ data?: T; error: unknown; loading: boolean }>({ error: null, loading: enabled });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState((s) => ({ data: s.data, error: null, loading: true }));
    fnRef
      .current()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: undefined, error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/**
 * Films de la watchlist, dans l'ordre d'ajout (le plus récent d'abord).
 * La liste vient de la base (une requête) et s'affiche tout de suite. Avec `withRuntime`
 * (tri « plus courts d'abord »), les durées manquantes sont demandées à TMDB, 4 à la fois.
 */
export function useWatchlistMovies(withRuntime = false) {
  const d = useProfile();
  const ready = d.status === "ready" && !!d.sb;
  const ids = [...d.watchlist].sort((a, b) => a - b).join(",");
  const [state, setState] = useState<{ data?: Movie[]; error: unknown; loading: boolean; refining: boolean }>({ error: null, loading: true, refining: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    setState((s) => ({ data: s.data, error: null, loading: true, refining: false }));
    (async () => {
      const list = await loadWatchlistFilms(d.sb!);
      const missing = withRuntime ? list.filter((m) => m.runtime == null) : [];
      if (ctl.signal.aborted) return;
      setState({ data: list, error: null, loading: false, refining: missing.length > 0 });
      if (!missing.length) return;
      await mapLimit(missing, 4, async (m) => {
        const det = await tmdb<Movie>(`movie/${m.id}`, {}, { signal: ctl.signal }).catch(() => null);
        if (det?.runtime) m.runtime = det.runtime;
      });
      if (!ctl.signal.aborted) setState({ data: [...list], error: null, loading: false, refining: false });
    })().catch((error) => !ctl.signal.aborted && setState({ data: undefined, error, loading: false, refining: false }));
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, ready, withRuntime, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
