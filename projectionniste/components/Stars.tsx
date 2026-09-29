"use client";

import { useState } from "react";
import { num1 } from "@/lib/format";

/** Note en étoiles, cliquable par demi-étoile. */
export function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className="stars" role="radiogroup" aria-label="Ta note" onMouseLeave={() => setHover(0)}>
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
              className={v % 1 ? "l" : "r"}
              role="radio"
              aria-checked={value === v}
              aria-label={`${num1(v)} sur 5`}
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
