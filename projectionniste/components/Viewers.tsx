"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { num1, plural } from "@/lib/format";
import { profileHref } from "@/lib/publicProfile";
import { filmViewers, type Viewers } from "@/lib/viewers";
import { useProfile } from "./ProfileProvider";
import { StarsText } from "./Stars";

// une seule requête par film et par état « vu » (la fiche l'utilise à deux endroits)
const cache = new Map<string, Promise<Viewers>>();

export function useViewers(tmdbId: number): Viewers | null {
  const { sb, status, seen, rated } = useProfile();
  const key = `${tmdbId}:${seen.has(tmdbId)}:${rated.get(tmdbId) ?? ""}`;
  const [data, setData] = useState<Viewers | null>(null);
  useEffect(() => {
    if (status !== "ready" || !sb) return;
    let p = cache.get(key);
    if (!p) {
      p = filmViewers(sb, tmdbId).catch(() => ({ total: 0, avg: null, list: [] }));
      cache.set(key, p);
    }
    let live = true;
    p.then((v) => live && setData(v));
    return () => {
      live = false;
    };
  }, [key, sb, status, tmdbId]);
  return data;
}

const initial = (n: string) => n.trim()[0]?.toUpperCase() ?? "?";

/** « Qui l'a vu » : les membres qui ont vu le film, avec leur note. */
export function FilmViewers({ tmdbId }: { tmdbId: number }) {
  const { userId } = useProfile();
  const { status } = useProfile();
  const v = useViewers(tmdbId);
  if (status !== "ready") return null;
  if (!v) return <aside className="viewers" aria-busy="true" style={{ minHeight: 120 }} />;
  if (!v.total)
    return (
      <aside className="viewers">
        <h2 className="block-title">
          Qui l'a <span>vu</span>
        </h2>
        <p className="note" style={{ margin: 0 }}>
          Personne sur Filmable pour l'instant. Sois le premier à le noter.
        </p>
      </aside>
    );
  const shown = v.list.slice(0, 6);
  return (
    <aside className="viewers">
      <h2 className="block-title">
        Qui l'a <span>vu</span>
      </h2>
      <div className="viewers-top">
        <div>
          <div className="big">
            {v.avg != null ? num1(v.avg) : "—"}
            <small>/5</small>
          </div>
          <div className="dim" style={{ fontSize: 13, marginTop: 6 }}>
            {plural(v.total, "membre l'a vu", "membres l'ont vu")}
          </div>
        </div>
        <div className="faces" aria-hidden>
          {v.list.slice(0, 5).map((p) => (
            <span key={p.user_id} className={`face${p.user_id === userId ? " me" : ""}`}>
              {p.avatar_url ? <img src={p.avatar_url} alt="" /> : initial(p.name)}
            </span>
          ))}
        </div>
      </div>
      <ul>
        {shown.map((p) => (
          <li key={p.user_id}>
            <span className={`face${p.user_id === userId ? " me" : ""}`} aria-hidden>
              {p.avatar_url ? <img src={p.avatar_url} alt="" /> : initial(p.name)}
            </span>
            <span className="n">{p.user_id === userId ? "Toi" : <Link href={profileHref(p.user_id, p.username)}>{p.name}</Link>}</span>
            {p.favorite ? (
              <span className="heart" title="Coup de cœur">
                ♥
              </span>
            ) : null}
            {p.rating ? <StarsText value={p.rating} /> : <span className="dim">vu</span>}
          </li>
        ))}
      </ul>
      {v.total > shown.length ? <p className="dim" style={{ fontSize: 13, margin: "12px 0 0" }}>et {plural(v.total - shown.length, "autre membre", "autres membres")}</p> : null}
    </aside>
  );
}
