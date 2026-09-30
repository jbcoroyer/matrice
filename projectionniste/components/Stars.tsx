"use client";

import { useRef, useState } from "react";
import { num1 } from "@/lib/format";

/** Note en étoiles, cliquable par demi-étoile. */
export function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const box = useRef<HTMLSpanElement>(null);
  // un seul arrêt de tabulation : la note choisie, sinon la première demi-étoile
  const stop = value >= 0.5 ? value : 0.5;
  // flèches : on déplace le focus d'une demi-étoile ; Entrée ou Espace valide (aucun enregistrement à chaque flèche)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, (v: number) => number> = {
      ArrowRight: (v) => Math.min(5, v + 0.5),
      ArrowUp: (v) => Math.min(5, v + 0.5),
      ArrowLeft: (v) => Math.max(0.5, v - 0.5),
      ArrowDown: (v) => Math.max(0.5, v - 0.5),
      Home: () => 0.5,
      End: () => 5,
    };
    const next = keys[e.key];
    if (!next) return;
    const cur = +(document.activeElement?.getAttribute("data-v") ?? stop);
    e.preventDefault();
    box.current?.querySelector<HTMLButtonElement>(`button[data-v="${next(cur)}"]`)?.focus();
  };
  return (
    <span ref={box} className="stars" role="radiogroup" aria-label="Ta note" onMouseLeave={() => setHover(0)} onKeyDown={onKeyDown}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="star">
          <span aria-hidden="true">★</span>
          <span className={`fill${shown >= i ? " full" : shown >= i - 0.5 ? " half" : ""}`} aria-hidden="true">
            ★
          </span>
          {[i - 0.5, i].map((v) => (
            <button
              key={v}
              type="button"
              data-v={v}
              tabIndex={v === stop ? 0 : -1}
              className={v % 1 ? "l" : "r"}
              role="radio"
              aria-checked={value === v}
              aria-label={`${String(v).replace(".", ",")} sur 5`}
              onMouseEnter={() => setHover(v)}
              onFocus={() => setHover(v)}
              onBlur={() => setHover(0)}
              onClick={() => onChange(v)}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

/** Note en lecture seule : ★★★½ */
export function StarsText({ value }: { value: number | null | undefined }) {
  if (!value) return null;
  const full = Math.floor(value);
  return (
    <span className="stars-text" title={`${num1(value)} sur 5`} aria-label={`${num1(value)} sur 5`}>
      {"★".repeat(full)}
      {value - full >= 0.5 ? "½" : ""}
    </span>
  );
}
