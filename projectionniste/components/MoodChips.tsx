"use client";

import Link from "next/link";
import { MOODS } from "@/lib/moods";

/** Les humeurs sous forme de pastilles. */
export function MoodChips({ current }: { current?: string }) {
  return (
    <div className="mood-chips" aria-label="Humeurs">
      <span className="dim">Humeur :</span>
      {MOODS.map((m) => (
        <Link key={m.slug} href={`/decouvrir/humeurs/${m.slug}`} className="mchip" aria-current={current === m.slug ? "page" : undefined} title={m.s}>
          {m.t}
        </Link>
      ))}
    </div>
  );
}
