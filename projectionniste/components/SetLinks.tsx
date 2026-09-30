"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { plural } from "@/lib/format";
import { personFilms, personKey, sagaKey, setsWithFilm, upcoming, type Role } from "@/lib/sets";
import type { PersonCredits } from "@/lib/types";
import { useProfile } from "./ProfileProvider";

/** « Fait partie de : saga Alien · Palmes d'or » sous les actions d'une fiche film. */
export function FilmSets({ tmdbId, saga }: { tmdbId: number; saga: { id: number; name: string } | null }) {
  const { sb, status } = useProfile();
  const [sets, setSets] = useState<{ key: string; title: string }[]>([]);
  useEffect(() => {
    if (sb && status === "ready") setsWithFilm(sb, tmdbId).then(setSets, () => {});
  }, [sb, status, tmdbId]);
  const all = [...(saga ? [{ key: sagaKey(saga.id), title: saga.name.replace(/\s*[-–]\s*(saga|collection)$/i, "") }] : []), ...sets];
  const uniq = all.filter((s, i) => all.findIndex((x) => x.key === s.key) === i);
  if (!uniq.length) return null;
  return (
    <p className="film-sets">
      Fait partie de{" "}
      {uniq.map((s, i) => (
        <span key={s.key}>
          {i ? " · " : ""}
          <Link href={`/ensembles/${s.key}`}>{s.key.startsWith("saga-") ? `la saga ${s.title}` : s.title}</Link>
        </span>
      ))}
    </p>
  );
}

/** Sur la fiche d'une personne : où tu en es de ses films, et la porte vers un rayon ou un cycle. */
export function Retrospective({ personId, credits, dept }: { personId: number; credits: PersonCredits; dept: string }) {
  const { status, seen, owned } = useProfile();
  const role: Role = dept === "Directing" ? "director" : "main";
  const films = personFilms(credits, role).filter((m) => !upcoming(m));
  const ids = [...new Set(films.map((m) => m.id))];
  if (ids.length < 3) return null;
  const seenN = ids.filter((id) => seen.has(id)).length;
  const ownN = ids.filter((id) => owned.has(id)).length;
  return (
    <section className="retro">
      <p className="label">Rétrospective</p>
      <p className="retro-line">
        {status === "ready" ? (
          <>
            Tu as vu <b>{seenN}</b> de ses {plural(ids.length, "film")}
            {role === "director" ? " en tant que réalisateur" : " (rôles principaux)"}, tu en possèdes <b>{ownN}</b>.
          </>
        ) : (
          <>{plural(ids.length, "film")} {role === "director" ? "réalisés" : "en rôle principal"}.</>
        )}
      </p>
      <Link className="btn" href={`/ensembles/${personKey(personId, role)}`}>
        Voir tous ses films · rayon ou cycle
      </Link>
    </section>
  );
}
