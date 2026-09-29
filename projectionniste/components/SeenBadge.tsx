"use client";

import { num1 } from "@/lib/format";
import { useProfile } from "./ProfileProvider";

export function SeenBadge({ id }: { id: number }) {
  const { seen, watchlist, rated } = useProfile();
  if (seen.has(id)) {
    const r = rated.get(id);
    return <span className="badge">Vu{r ? ` · ${num1(r)}/5` : ""}</span>;
  }
  if (watchlist.has(id)) return <span className="badge red">Watchlist</span>;
  return null;
}
