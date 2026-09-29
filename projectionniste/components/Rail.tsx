"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Ranked } from "@/lib/types";
import { FilmCard } from "./FilmCard";
import { duo } from "./ui";

/** Rangée horizontale d'affiches, avec lien « Tout voir » et flèches sur ordinateur. */
export function Rail({
  title,
  sub,
  href,
  list,
  loading,
  empty,
}: {
  title: string;
  sub?: string;
  href?: string;
  list?: Ranked[];
  loading?: boolean;
  empty?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  if (!loading && list && !list.length && !empty) return null;
  return (
    <section className="rail-wrap">
      <div className="rail-head">
        <div>
          <h2>{href ? <Link href={href}>{duo(title)}</Link> : duo(title)}</h2>
          {sub ? <p>{sub}</p> : null}
        </div>
        <div className="rail-tools">
          {href ? <Link href={href}>Tout voir →</Link> : null}
          <button type="button" className="arrow" aria-label="Précédents" onClick={() => scroll(-1)}>
            ‹
          </button>
          <button type="button" className="arrow" aria-label="Suivants" onClick={() => scroll(1)}>
            ›
          </button>
        </div>
      </div>
      {loading || !list ? (
        <div className="rail" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card">
              <div className="poster sk" />
              <div className="sk sk-line w80" />
              <div className="sk sk-line w40" />
            </div>
          ))}
        </div>
      ) : list.length ? (
        <div className="rail" ref={ref}>
          {list
            .filter((m, i) => list.findIndex((x) => x.id === m.id) === i)
            .map((m) => (
              <FilmCard key={m.id} m={m} />
            ))}
        </div>
      ) : (
        <p className="status">{empty}</p>
      )}
    </section>
  );
}

/** Lien de retour en haut des pages « Tout voir ». */
export function BackLink({ href = "/decouvrir", label = "Découvrir" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="back">
      ← {label}
    </Link>
  );
}
