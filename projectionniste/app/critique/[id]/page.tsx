"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { ReviewText } from "@/components/DiaryEntries";
import { LogDialog } from "@/components/LogDialog";
import { useProfile } from "@/components/ProfileProvider";
import { LikeButton, ReviewMeta, useLikes } from "@/components/Reviews";
import { ErrorLine, Loader } from "@/components/ui";
import { frDate } from "@/lib/format";
import { addComment, authorName, deleteComment, getReview, listComments, type Comment, type Review } from "@/lib/reviews";
import { supabase } from "@/lib/supabase";
import { img } from "@/lib/tmdb";

/** Une critique : lisible par tous si elle est publique ; j'aime et commentaires pour les membres. */
export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status, userId, toast } = useProfile();
  const [review, setReview] = useState<Review | null | undefined>(undefined);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    const sb = supabase();
    if (!sb) return setError(new Error("Service indisponible."));
    setError(null);
    Promise.all([getReview(sb, id), listComments(sb, id).catch(() => [])]).then(([r, c]) => {
      setReview(r);
      setComments(c);
    }, setError);
  }, [id]);
  useEffect(() => {
    if (status !== "loading") load();
  }, [status, load]);

  const list = review ? [review] : null;
  const { liked, toggle } = useLikes(list, (f) => setReview((r) => (r ? f([r])[0] : r)));

  const mine = status === "ready" && review?.user_id === userId;

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = supabase();
    if (!sb || !userId || !draft.trim()) return;
    setPosting(true);
    try {
      const c = await addComment(sb, userId, id, draft);
      setComments((l) => [...l, c]);
      setReview((r) => (r ? { ...r, comments: r.comments + 1 } : r));
      setDraft("");
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`);
    } finally {
      setPosting(false);
    }
  };

  const remove = async (c: Comment) => {
    const sb = supabase();
    if (!sb || !confirm("Supprimer ce commentaire ?")) return;
    try {
      await deleteComment(sb, c.id);
      setComments((l) => l.filter((x) => x.id !== c.id));
      setReview((r) => (r ? { ...r, comments: Math.max(0, r.comments - 1) } : r));
    } catch (err) {
      toast(`Échec : ${(err as Error).message}`);
    }
  };

  if (error) return <ErrorLine error={error} onRetry={load} />;
  if (review === undefined) return <Loader text="Chargement de la critique…" />;
  if (!review || (!review.review_public && !mine))
    return (
      <section className="section">
        <h1>Critique introuvable</h1>
        <p className="lede">Ce lien n'existe pas, la critique a été supprimée, ou elle est privée.</p>
      </section>
    );

  const f = review.films;
  const year = (f?.release_date || "").slice(0, 4);
  const film = { id: review.tmdb_id, title: f?.title ?? "Film", release_date: f?.release_date ?? undefined, poster_path: f?.poster_path };

  return (
    <article className="section review-page">
      <div className="review-head">
        <Link href={`/film/${review.tmdb_id}`} className="thumb">
          {f?.poster_path ? <img src={img(f.poster_path, "w185")} alt={`Affiche de ${f.title}`} /> : null}
        </Link>
        <div>
          <p className="kicker">
            {mine ? "Ta critique" : `Critique de ${authorName(review.author)}`}
            {!review.review_public ? " · privée" : ""}
          </p>
          <h1>
            <Link href={`/film/${review.tmdb_id}`}>{f?.title}</Link> {year ? <span className="dim">{year}</span> : null}
          </h1>
          <p className="line">
            <ReviewMeta r={review} />
          </p>
        </div>
      </div>

      <div className="review-body">
        <ReviewText text={review.review} spoilers={review.spoilers && !mine} full />
      </div>
      {review.tags.length ? (
        <p className="tags-line">
          {review.tags.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </p>
      ) : null}

      <div className="review-foot big">
        <LikeButton r={review} liked={liked.has(review.id)} onToggle={mine ? undefined : toggle && (() => toggle(review))} />
        <span className="dim">Publiée le {frDate(review.created_at)}</span>
        {mine ? (
          <button type="button" className="link-btn quiet" onClick={() => setEditing(true)}>
            Modifier
          </button>
        ) : null}
        {review.review_public ? (
          <button
            type="button"
            className="link-btn quiet"
            onClick={() => navigator.clipboard.writeText(location.href).then(() => toast("Lien de la critique copié"))}
          >
            Copier le lien
          </button>
        ) : null}
      </div>

      <section className="comments">
        <h2>
          Commentaires <span className="dim">· {comments.length}</span>
        </h2>
        {comments.length ? (
          <ul>
            {comments.map((c) => (
              <li key={c.id}>
                <div className="line">
                  <b>{c.user_id === userId ? "Toi" : authorName(c.author)}</b>
                  <span className="dim">{frDate(c.created_at, { day: "numeric", month: "short", year: "numeric" })}</span>
                  {status === "ready" && (c.user_id === userId || mine) ? (
                    <button type="button" className="link-btn quiet" onClick={() => remove(c)}>
                      Supprimer
                    </button>
                  ) : null}
                </div>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="note">Pas encore de commentaire.</p>
        )}
        {status === "ready" ? (
          review.review_public ? (
            <form className="comment-form" onSubmit={post}>
              <textarea
                rows={3}
                maxLength={2000}
                value={draft}
                placeholder={mine ? "Répondre aux commentaires…" : "Ton commentaire…"}
                aria-label="Ton commentaire"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post(e);
                }}
              />
              <button type="submit" className="btn primary" disabled={posting || !draft.trim()}>
                {posting ? "Envoi…" : "Publier"}
              </button>
            </form>
          ) : null
        ) : (
          <p className="note">
            <Link href="/">Connecte-toi</Link> pour aimer cette critique et la commenter.
          </p>
        )}
      </section>

      {editing && review ? (
        <LogDialog
          film={film}
          entry={{ ...review, films: f ? { title: f.title, release_date: f.release_date, poster_path: f.poster_path } : null }}
          onClose={() => setEditing(false)}
          onSaved={(e) => (e ? load() : (location.href = "/journal"))}
        />
      ) : null}
    </article>
  );
}
