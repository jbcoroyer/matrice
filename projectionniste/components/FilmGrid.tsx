"use client";

import { useState } from "react";
import type { Ranked } from "@/lib/types";
import { FilmCard } from "./FilmCard";

/**
 * Grille d'affiches. Par défaut, la liste est révélée par tranches (« Voir plus ») pour
 * rester fluide ; avec `paged`, elle vient déjà par pages distantes : tout est affiché et
 * le bouton appelle `onMore` tant qu'il reste des pages.
 * Pour repartir du début quand les filtres changent, le parent change la `key`.
 */
export function FilmGrid({
  list,
  lead,
  step = 30,
  paged,
  onMore,
  loadingMore,
}: {
  list: Ranked[];
  lead?: boolean;
  step?: number;
  paged?: boolean;
  onMore?: () => void;
  loadingMore?: boolean;
}) {
  const [shown, setShown] = useState(step);
  const visible = paged ? list : list.slice(0, shown);
  const canLocal = !paged && shown < list.length;
  return (
    <>
      <div className={`grid${lead ? " lead" : ""}`}>
        {visible.map((m, i) => (
          <FilmCard key={m.id} m={m} i={i} />
        ))}
      </div>
      {canLocal || onMore ? (
        <div className="more">
          <button type="button" className="btn ghost" disabled={loadingMore} onClick={() => (canLocal ? setShown((s) => s + step) : onMore?.())}>
            {loadingMore ? "Chargement…" : "Voir plus"}
          </button>
        </div>
      ) : null}
    </>
  );
}
