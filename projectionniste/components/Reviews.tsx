"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { frDate, plural } from "@/lib/format";
import { authorName, filmReviews, myLikes, setLike, type Review } from "@/lib/reviews";
import { ReviewText } from "./DiaryEntries";
import { DIARY_EVENT } from "./FilmPanel";
import { useProfile } from "./ProfileProvider";
import { StarsText } from "./Stars";

/** Bouton « j'aime » d'une critique, avec son compteur. */
export function LikeButton({ r, liked, onToggle }: { r: Review; liked: boolean; onToggle?: () => void }) {
  const label = r.likes ? plural(r.likes, "j'aime", "j'aime") : "J'aime";
  if (!onToggle)
    return (
      <span className="like-btn static" title="Connecte-toi pour aimer cette critique">
        ♥ {label}
      </span>
    );
  return (
    <button type="button" className="like-btn" aria-pressed={liked} onClick={onToggle} title={liked ? "Je n'aime plus" : "J'aime cette critique"}>
      ♥ {label}
    </button>
  );
}

/** Aimer / ne plus aimer, avec mise à jour immédiate et retour arrière en cas d'échec. */
export function useLikes(reviews: Review[] | null, setReviews: (f: (l: Review[]) => Review[]) => void) {
  const { sb, userId, status, toast } = useProfile();
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const ids = (reviews ?? []).map((r) => r.id).join(",");
  useEffect(() => {
    if (sb && userId && ids) myLikes(sb, userId, ids.split(",")).then(setLiked, () => {});
  }, [sb, userId, ids]);
  const toggle = async (r: Review) => {
    if (!sb || !userId) return;
    const on = !liked.has(r.id);
    const apply = (on: boolean) => {
      setLiked((s) => {
        const n = new Set(s);
        if (on) n.add(r.id);
        else n.delete(r.id);
        return n;
      });
      setReviews((l) => l.map((x) => (x.id === r.id ? { ...x, likes: Math.max(0, x.likes + (on ? 1 : -1)) } : x)));
    };
    apply(on);
    try {
      await setLike(sb, userId, r.id, on);
    } catch (e) {
      apply(!on);
      toast(`Échec : ${(e as Error).message}`);
    }
  };
  return { liked, toggle: status === "ready" ? toggle : undefined };
}

export function ReviewMeta({ r }: { r: Review }) {
  return (
    <>
      <StarsText value={r.rating} />
      {r.liked ? (
        <span className="like" title="A aimé le film">
          ♥
        </span>
      ) : null}
      {r.rewatch ? <span className="dim">↻ revu</span> : null}
      {r.watched_on ? <span className="dim">vu le {frDate(r.watched_on)}</span> : null}
    </>
  );
}

/** Une critique dans une liste (fiche film). */
export function ReviewCard({ r, liked, onLike, mine }: { r: Review; liked: boolean; onLike?: () => void; mine?: boolean }) {
  return (
    <li className="review-card">
      <div className="line">
        <b>{mine ? "Ta critique" : authorName(r.author)}</b>
        <ReviewMeta r={r} />
      </div>
      <ReviewText text={r.review} spoilers={r.spoilers && !mine} />
      <div className="review-foot">
        <LikeButton r={r} liked={liked} onToggle={mine ? undefined : onLike} />
        <Link href={`/critique/${r.id}`} className="link-quiet">
          {r.comments ? plural(r.comments, "commentaire") : "Commenter"}
        </Link>
      </div>
    </li>
  );
}

const STEP = 6;

/** Les critiques publiques d'un film, sur sa fiche. */
export function FilmReviews({ tmdbId }: { tmdbId: number }) {
  const { sb, userId, status } = useProfile();
  const [sort, setSort] = useState<"popular" | "recent">("popular");
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [shown, setShown] = useState(STEP);
  const load = useCallback(() => {
    if (sb) filmReviews(sb, tmdbId, sort).then(setReviews, () => setReviews([]));
  }, [sb, tmdbId, sort]);
  useEffect(() => {
    if (status !== "ready") return;
    load();
    const on = (e: Event) => (e as CustomEvent).detail === tmdbId && load();
    window.addEventListener(DIARY_EVENT, on);
    return () => window.removeEventListener(DIARY_EVENT, on);
  }, [status, load, tmdbId]);
  const { liked, toggle } = useLikes(reviews, (f) => setReviews((l) => (l ? f(l) : l)));

  if (!reviews?.length) return null;
  return (
    <section className="section film-reviews">
      <div className="sec-head">
        <h2>
          Critiques <span className="dim">· {reviews.length}</span>
        </h2>
        {reviews.length > 1 ? (
          <span className="seg" role="group" aria-label="Trier les critiques">
            <button type="button" aria-pressed={sort === "popular"} onClick={() => setSort("popular")}>
              Populaires
            </button>
            <button type="button" aria-pressed={sort === "recent"} onClick={() => setSort("recent")}>
              Récentes
            </button>
          </span>
        ) : null}
      </div>
      <ul className="review-list">
        {reviews.slice(0, shown).map((r) => (
          <ReviewCard key={r.id} r={r} liked={liked.has(r.id)} onLike={toggle && (() => toggle(r))} mine={r.user_id === userId} />
        ))}
      </ul>
      {reviews.length > shown ? (
        <div className="more">
          <button type="button" className="btn ghost" onClick={() => setShown((n) => n + STEP * 2)}>
            Voir plus de critiques
          </button>
        </div>
      ) : null}
    </section>
  );
}
