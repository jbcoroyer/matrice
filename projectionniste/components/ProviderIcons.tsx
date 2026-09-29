"use client";

import { useEffect, useRef, useState } from "react";
import { dedupeProviders, img, providers, streamable } from "@/lib/tmdb";
import type { ProviderOffers } from "@/lib/types";
import { useProfile } from "./ProfileProvider";

/** Logos des plateformes où voir le film (les tiennes d'abord), chargés quand la carte devient visible. */
export function ProviderIcons({ id, large, max = 4 }: { id: number; large?: boolean; max?: number }) {
  const { platforms } = useProfile();
  const ref = useRef<HTMLDivElement>(null);
  const [fr, setFr] = useState<ProviderOffers | null | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const load = () => providers(id).then((r) => alive && setFr(r));
    if (!("IntersectionObserver" in window)) {
      load();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [id]);

  const list = streamable(fr);
  const mine = list.filter((p) => platforms.has(p.provider_id));
  const show = dedupeProviders(mine.length ? mine : list).slice(0, max);

  return (
    <div ref={ref} className={`provs${large ? " prov-lg" : ""}`}>
      {show.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.provider_id}
          src={img(p.logo_path, "w92")}
          alt={p.provider_name}
          title={`${p.provider_name}${platforms.has(p.provider_id) ? " (abonné)" : ""}`}
          className={large && platforms.has(p.provider_id) ? "mine" : undefined}
          loading="lazy"
        />
      ))}
    </div>
  );
}
