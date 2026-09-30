"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ListCover } from "@/components/ListDialogs";
import { Poster } from "@/components/Poster";
import { useProfile } from "@/components/ProfileProvider";
import { StarsText } from "@/components/Stars";
import { ErrorLine, Loader, SecHead } from "@/components/ui";
import { loadTop, type TopFilm } from "@/lib/diary";
import { frDate, truncate, yearOf } from "@/lib/format";
import { myLists, type ListSummary } from "@/lib/lists";
import { getPublicProfile, memberName, type PublicProfile } from "@/lib/publicProfile";
import { userReviews, type Review } from "@/lib/reviews";
import { supabase } from "@/lib/supabase";

type Data = { profile: PublicProfile; top: TopFilm[]; lists: ListSummary[]; reviews: Review[] };

/** Profil public : ce que le membre a choisi de montrer, lisible sans compte. */
export default function PublicProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { userId } = useProfile();
  const [data, setData] = useState<Data | null | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let alive = true;
    setError(null);
    (async () => {
      const profile = await getPublicProfile(sb, handle);
      if (!profile) return alive && setData(null);
      const [top, lists, reviews] = await Promise.all([
        loadTop(sb, profile.id).catch(() => [] as TopFilm[]),
        myLists(sb, profile.id).catch(() => [] as ListSummary[]),
        userReviews(sb, profile.id).catch(() => [] as Review[]),
      ]);
      if (alive) setData({ profile, top, lists: lists.filter((l) => l.is_public), reviews });
    })().catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [handle, attempt]);

  if (error) return <ErrorLine error={error} onRetry={() => setAttempt((a) => a + 1)} />;
  if (data === undefined) return <Loader text="Chargement du profil…" />;
  if (data === null)
    return (
      <section className="gate">
        <h1>Profil introuvable</h1>
        <p className="note">Ce pseudo n'existe pas, ou le profil a changé d'adresse.</p>
        <div className="row-actions">
          <Link className="btn primary" href="/">
            Retour à l'accueil
          </Link>
        </div>
      </section>
    );

  const { profile: p, top, lists, reviews } = data;
  const name = memberName(p);
  const since = new Date(p.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const mine = userId === p.id;
  const slots = [1, 2, 3, 4, 5].map((n) => top.find((t) => t.slot === n) ?? null);

  return (
    <>
      <section className="pub-head">
        <span className="pub-avatar" aria-hidden>
          {p.avatar_url ? <img src={p.avatar_url} alt="" /> : name[0]?.toUpperCase()}
        </span>
        <div>
          <p className="label">
            Profil{p.username ? <span className="handle"> · @{p.username}</span> : null}
          </p>
          <SecHead as="h1" title={name} />
          {p.bio ? <p className="lede">{p.bio}</p> : null}
          <p className="dim">Membre depuis {since}</p>
          {mine ? (
            <p className="note">
              Voici ce que les autres voient de ton profil. <Link className="link" href="/parametres">Modifier dans les paramètres</Link>
            </p>
          ) : null}
        </div>
      </section>

      {top.length ? (
        <section className="section">
          <SecHead title="Top 5" />
          <div className="grid top5">
            {slots.map((t, i) =>
              t ? (
                <div key={i} className="card">
                  <Link href={`/film/${t.tmdb_id}`}>
                    <Poster path={t.films?.poster_path} title={t.films?.title ?? ""} />
                    <div className="card-title">
                      {i + 1}. {t.films?.title}
                    </div>
                  </Link>
                </div>
              ) : (
                <div key={i} className="card" aria-hidden>
                  <div className="poster top-empty" />
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      {lists.length ? (
        <section className="section">
          <SecHead title="Listes" aside={`${lists.length} publique${lists.length > 1 ? "s" : ""}`} />
          <ul className="lists">
            {lists.map((l) => (
              <li key={l.id}>
                <Link href={`/listes/${l.id}`}>
                  <ListCover posters={l.posters} />
                  <span className="t">{l.title}</span>
                </Link>
                <span className="dim">
                  {l.count} film{l.count > 1 ? "s" : ""}
                  {l.ranked ? " · classée" : ""}
                </span>
                {l.description ? <p className="desc">{l.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {reviews.length ? (
        <section className="section">
          <SecHead title="Critiques" />
          <ul className="pub-reviews">
            {reviews.map((r) => (
              <li key={r.id}>
                <Link className="pr-poster" href={`/film/${r.tmdb_id}`} aria-label={r.films?.title ?? "Voir le film"}>
                  <Poster path={r.films?.poster_path} title={r.films?.title ?? ""} size="w185" />
                </Link>
                <div>
                  <h3>
                    <Link href={`/film/${r.tmdb_id}`}>{r.films?.title}</Link> <span className="dim">{yearOf({ release_date: r.films?.release_date ?? undefined })}</span>
                  </h3>
                  <p className="pr-meta">
                    <StarsText value={r.rating} />
                    {r.watched_on ? <span className="dim">vu le {frDate(r.watched_on)}</span> : null}
                  </p>
                  <p className="pr-text">{r.spoilers ? "Cette critique révèle des éléments de l'intrigue." : truncate(r.review, 260)}</p>
                  <Link className="link-quiet" href={`/critique/${r.id}`}>
                    Lire la critique
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!top.length && !lists.length && !reviews.length ? <p className="status">{name} n'a encore rien rendu public.</p> : null}
    </>
  );
}
