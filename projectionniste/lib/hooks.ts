"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { providers, streamable, tmdb } from "./tmdb";
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

/** Garde les films visibles sur au moins une de mes plateformes (abonnement, gratuit, pub). */
export async function filterMine<T extends Movie>(list: T[], platforms: Set<number>): Promise<T[]> {
  if (!platforms.size) return list;
  const frs = await Promise.all(list.map((m) => providers(m.id)));
  return list.filter((_, i) => streamable(frs[i]).some((p) => platforms.has(p.provider_id)));
}

/** La sélection « Pour toi », recalculée quand l'historique change. */
export function useRecs(force = 0) {
  const d = useProfile();
  const ready = d.status === "ready" && !!d.profile;
  return useAsync<Ranked[]>(
    () => buildRecs(d.profile!, d, { force: force > 0 }),
    [d.profile, d.rated.size, d.seen.size, d.hidden.size, force],
    ready,
  );
}

/** Films de la watchlist, classés par indice. */
export function useWatchlistMovies() {
  const d = useProfile();
  const ready = d.status === "ready";
  const ids = [...d.watchlist].sort((a, b) => a - b).join(",");
  return useAsync<Ranked[]>(
    async () => {
      const det = await Promise.all([...d.watchlist].map((id) => tmdb<Movie>(`movie/${id}`).catch(() => null)));
      return det
        .filter((m): m is Movie => !!m)
        .map((m) => ({ ...m, _pred: d.predict(m).v }))
        .sort((a, b) => b._pred - a._pred);
    },
    [ids, d.profile],
    ready,
  );
}

/** Applique le filtre « Sur mes plateformes » si coché. */
export function useMineFilter(list: Ranked[] | undefined): Async<Ranked[]> {
  const { prefs, platforms } = useProfile();
  const on = prefs.onlyMine && platforms.size > 0;
  const key = list ? list.map((m) => m.id).join(",") : "";
  return useAsync<Ranked[]>(async () => (on ? filterMine(list!, platforms) : list!), [key, on, [...platforms].join(",")], !!list);
}
