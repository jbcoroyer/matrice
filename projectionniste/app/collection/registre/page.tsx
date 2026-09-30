"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, Loader, ProfileGate } from "@/components/ui";
import { formatLabel, groupEntries, listCollection, type CollectionItem } from "@/lib/collection";
import { plural } from "@/lib/format";

const count = <K,>(keys: K[]) => {
  const m = new Map<K, number>();
  for (const k of keys) m.set(k, (m.get(k) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

/** Le registre : les chiffres de la collection, rangés hors de l'étagère. */
function Registre() {
  const { sb, seen } = useProfile();
  const [items, setItems] = useState<CollectionItem[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (sb) listCollection(sb).then(setItems, setError);
  }, [sb]);

  const r = useMemo(() => {
    if (!items) return null;
    const films = groupEntries(items);
    return {
      films: films.length,
      copies: items.length,
      formats: count(items.map((i) => i.format)),
      publishers: count(items.map((i) => i.publisher?.trim()).filter((p): p is string => !!p)).slice(0, 12),
      numbered: items.filter((i) => i.edition_no),
      sealed: items.filter((i) => i.sealed).length,
      lent: items.filter((i) => i.lent_to).length,
      unseen: films.filter((e) => !seen.has(e.tmdb_id)).length,
      years: count(items.map((i) => (i.acquired_on || i.created_at).slice(0, 4))).sort((a, b) => b[0].localeCompare(a[0])),
    };
  }, [items, seen]);

  if (error) return <ErrorLine error={error} />;
  if (!r) return <Loader text="Chargement du registre…" />;
  return (
    <section className="registre">
      <Link href="/collection" className="back">
        ← Ma cinémathèque
      </Link>
      <p className="label">Collection physique</p>
      <h1>
        Le <span>registre</span>
      </h1>
      <p className="lede">
        {plural(r.films, "film")}, {plural(r.copies, "exemplaire")}.
        {r.sealed ? ` ${plural(r.sealed, "encore scellé", "encore scellés")}.` : ""}
        {r.lent ? ` ${plural(r.lent, "prêté", "prêtés")}.` : ""}
        {r.unseen ? ` ${plural(r.unseen, "film pas encore vu", "films pas encore vus")}.` : ""}
      </p>

      <div className="reg-cols">
        <div>
          <h2 className="label">Supports</h2>
          <dl className="reg-list">
            {r.formats.map(([f, n]) => (
              <div key={f}>
                <dt>{formatLabel(f)}</dt>
                <dd>{n}</dd>
              </div>
            ))}
          </dl>
        </div>
        {r.publishers.length ? (
          <div>
            <h2 className="label">Éditeurs</h2>
            <dl className="reg-list">
              {r.publishers.map(([p, n]) => (
                <div key={p}>
                  <dt>{p}</dt>
                  <dd>{n}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
        <div>
          <h2 className="label">Entrées par année</h2>
          <dl className="reg-list">
            {r.years.map(([y, n]) => (
              <div key={y}>
                <dt>{y}</dt>
                <dd>{n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {r.numbered.length ? (
        <div className="reg-block">
          <h2 className="label">Éditions numérotées · {r.numbered.length}</h2>
          <ul className="reg-numbered">
            {r.numbered.map((i) => (
              <li key={i.id}>
                <Link href={`/collection?film=${i.tmdb_id}`}>{i.films?.title}</Link>
                <span>
                  n° {i.edition_no}
                  {i.edition_of ? ` / ${i.edition_of}` : ""}
                  {i.publisher ? ` · ${i.publisher}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export default function Page() {
  return (
    <ProfileGate>
      <Registre />
    </ProfileGate>
  );
}
