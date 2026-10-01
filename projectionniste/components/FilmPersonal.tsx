"use client";

import { num1 } from "@/lib/format";
import type { Movie } from "@/lib/types";
import { Star } from "./icons";
import { useProfile } from "./ProfileProvider";

/** Ta note (si tu l'as donnée) et la note TMDB. */
export function ScoreBox({ movie }: { movie: Movie }) {
  const { rated } = useProfile();
  const mine = rated.get(movie.id);
  if (!mine && !movie.vote_count) return null;
  return (
    <div className="scorebar">
      {mine ? (
        <span className="pill">
          <Star />
          {num1(mine)} · ta note
        </span>
      ) : null}
      {movie.vote_count ? <span className="chip">TMDB {num1(movie.vote_average || 0)}</span> : null}
    </div>
  );
}
