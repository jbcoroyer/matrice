"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearTrail, markStep, trail, type Step } from "@/lib/trail";

/** Note la page dans le fil de l'exploration (film, cinéaste, ensemble). */
export function TrailMark({ href, label }: { href: string; label: string }) {
  useEffect(() => markStep(href, label), [href, label]);
  return null;
}

/** « Reprendre : Zodiac › David Fincher › Se7en » en haut de Découvrir, si on explorait tout à l'heure. */
export function TrailLine() {
  const [steps, setSteps] = useState<Step[]>([]);
  useEffect(() => setSteps(trail()), []);
  if (steps.length < 2) return null;
  return (
    <nav className="trail" aria-label="Ton exploration en cours">
      <span className="label">Reprendre</span>
      <span className="trail-steps">
        {steps.map((s, i) => (
          <span key={s.href}>
            {i ? <i aria-hidden="true"> › </i> : null}
            <Link href={s.href}>{s.label}</Link>
          </span>
        ))}
      </span>
      <button
        type="button"
        className="link-btn quiet"
        onClick={() => {
          clearTrail();
          setSteps([]);
        }}
      >
        Effacer
      </button>
    </nav>
  );
}
