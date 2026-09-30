"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { loadWatchlistFilms } from "./db";
import { mapLimit, tmdb } from "./tmdb";
import { knownVote } from "./votes";
import { buildRecs } from "./recs";
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

/** La sélection « Pour toi », recalculée quand l'historique change. */
export function useRecs(force = 0) {
  const d = useProfile();
  const ready = d.status === "ready" && !!d.profile;
  return useAsync<Ranked[]>(
    () => buildRecs(d.profile!, d, { force: force > 0 }),
    [d.profile, d.rated.size, d.seen.size, force],
    ready,
  );
}

/**
 * Films de la watchlist, classés par indice.
 * La liste vient de la base (une requête) et s'affiche tout de suite ; seules les notes TMDB
 * qu'on ne connaît pas encore sont demandées, quelques-unes à la fois, pour affiner l'indice.
 * Avec `withRuntime`, les durées manquantes sont demandées aussi (tri « plus courts d'abord »).
 */
export function useWatchlistMovies(withRuntime = false) {
  const d = useProfile();
  const ready = d.status === "ready" && !!d.sb;
  const ids = [...d.watchlist].sort((a, b) => a - b).join(",");
  const [state, setState] = useState<{ data?: Ranked[]; error: unknown; loading: boolean; refining: boolean }>({ error: null, loading: true, refining: false });
  const [tick, setTick] = useState(0);
  const predictRef = useRef(d.predict);
  predictRef.current = d.predict;

  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    const rank = (list: Movie[]): Ranked[] => list.map((m) => ({ ...m, _pred: predictRef.current(m).v })).sort((a, b) => b._pred - a._pred);
    setState((s) => ({ data: s.data, error: null, loading: true, refining: false }));
    (async () => {
      const rows = await loadWatchlistFilms(d.sb!);
      const list: Movie[] = rows.map((m) => ({ ...m, ...knownVote(m.id) }));
      const missing = list.filter((m) => m.vote_average === undefined || (withRuntime && m.runtime == null));
      if (ctl.signal.aborted) return;
      setState({ data: rank(list), error: null, loading: false, refining: missing.length > 0 });
      if (!missing.length) return;
      await mapLimit(missing, 4, async (m) => {
        const det = await tmdb<Movie>(`movie/${m.id}`, {}, { signal: ctl.signal }).catch(() => null);
        if (det) Object.assign(m, { vote_average: det.vote_average, vote_count: det.vote_count, runtime: det.runtime ?? m.runtime });
      });
      if (!ctl.signal.aborted) setState({ data: rank(list), error: null, loading: false, refining: false });
    })().catch((error) => !ctl.signal.aborted && setState({ data: undefined, error, loading: false, refining: false }));
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, d.profile, ready, withRuntime, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
