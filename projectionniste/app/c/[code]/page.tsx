"use client";

import { use, useEffect, useMemo, useState } from "react";
import { CollectionCard } from "@/components/CollectionCard";
import { duo, ErrorLine, Loader } from "@/components/ui";
import { formatLabel, FORMATS, getPublicCollection, groupEntries, type CollectionItem, type PublicItem } from "@/lib/collection";
import { supabase } from "@/lib/supabase";

/** Un exemplaire public, remis dans la forme d'un exemplaire de collection pour réutiliser la carte. */
function asItem(p: PublicItem, i: number): CollectionItem {
  return {
    id: `${p.tmdb_id}-${i}`,
    tmdb_id: p.tmdb_id,
    format: p.format,
    edition: p.edition,
    publisher: p.publisher,
    edition_no: p.edition_no,
    edition_of: p.edition_of,
    sealed: p.sealed,
    condition: p.condition,
    notes: p.notes,
    acquired_on: null,
    lent_to: null,
    lent_on: null,
    photo_path: p.photo_path,
    director: p.director,
    director_id: null,
    saga_id: null,
    saga_name: null,
    created_at: p.created_at,
    films: { title: p.film_title, release_date: p.release_date, poster_path: p.poster_path, genre_ids: p.genre_ids ?? [] },
  };
}

/** Cinémathèque partagée : lisible sans compte, sans rien révéler du journal ni des films vus. */
export default function PublicCollection({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [items, setItems] = useState<PublicItem[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [format, setFormat] = useState("");

  useEffect(() => {
    const sb = supabase();
    if (!sb) return setError(new Error("Service indisponible."));
    getPublicCollection(sb, code).then(setItems, setError);
  }, [code]);

  const entries = useMemo(() => groupEntries((items ?? []).map(asItem)), [items]);

  if (error) return <ErrorLine error={error} />;
  if (!items) return <Loader text="Chargement de la cinémathèque…" />;
  if (!items.length)
    return (
      <section className="section">
        <h1>Cinémathèque introuvable</h1>
        <p className="lede">Ce lien n'existe pas, n'est plus partagé, ou la cinémathèque est vide.</p>
      </section>
    );

  const head = items[0];
  const counts = FORMATS.map((f) => [f.k, items.filter((i) => i.format === f.k).length] as const).filter(([, n]) => n);
  const shown = format ? entries.filter((e) => e.copies.some((c) => c.format === format)) : entries;
  const title = head.title || (head.owner_name ? `La cinémathèque de ${head.owner_name}` : "Une cinémathèque");

  return (
    <>
      <div className="chero">
        <div className="chero-top">
          <div>
            <div className="label">Collection physique</div>
            <h1>{duo(title)}</h1>
            {head.description ? <p className="lede">{head.description}</p> : null}
          </div>
        </div>
        <dl className="cnums">
          <div>
            <dd>{entries.length.toLocaleString("fr-FR")}</dd>
            <dt className="label">Films</dt>
          </div>
          <div>
            <dd>{items.length.toLocaleString("fr-FR")}</dd>
            <dt className="label">Exemplaires</dt>
          </div>
        </dl>
        <div className="fbar">
          <div className="fbar-leg">
            {counts.map(([f, n]) => (
              <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(format === f ? "" : f)}>
                <i />
                {formatLabel(f)} <b>{n}</b>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="vitrine" style={{ marginTop: 40 }}>
        {shown.map((e) => (
          <CollectionCard key={e.tmdb_id} entry={e} />
        ))}
      </div>
      <p className="note" style={{ marginTop: 40 }}>
        Partagé depuis Filmable.
      </p>
    </>
  );
}
