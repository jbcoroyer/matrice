"use client";

import { use, useEffect, useMemo, useState } from "react";
import { conditionLabel, formatLabel, FORMATS, getPublicCollection, type PublicItem } from "@/lib/collection";
import { supabase } from "@/lib/supabase";
import { img } from "@/lib/tmdb";
import { ErrorLine, Loader } from "@/components/ui";

/** Collection partagée : lisible sans compte. */
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

  const films = useMemo(() => {
    const by = new Map<number, { item: PublicItem; copies: PublicItem[] }>();
    for (const it of items ?? []) {
      const e = by.get(it.tmdb_id) ?? { item: it, copies: [] };
      e.copies.push(it);
      by.set(it.tmdb_id, e);
    }
    return [...by.values()];
  }, [items]);

  if (error) return <ErrorLine error={error} />;
  if (!items) return <Loader text="Chargement de la collection…" />;
  if (!items.length)
    return (
      <section className="section">
        <h1>Collection introuvable</h1>
        <p className="lede">Ce lien n'existe pas, n'est plus partagé, ou la collection est vide.</p>
      </section>
    );

  const head = items[0];
  const counts = FORMATS.map((f) => [f.k, items.filter((i) => i.format === f.k).length] as const).filter(([, n]) => n);
  const shown = format ? films.filter((f) => f.copies.some((c) => c.format === format)) : films;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{head.title || (head.owner_name ? `La collection de ${head.owner_name}` : "Une collection de films")}</h1>
          {head.description ? <p className="lede">{head.description}</p> : null}
        </div>
      </div>
      <p className="coll-stats">
        <b>{films.length}</b> films · {items.length} exemplaires
        {counts.map(([f, n]) => (
          <button key={f} type="button" className={`chip${format === f ? " on" : ""}`} onClick={() => setFormat(format === f ? "" : f)}>
            {formatLabel(f)} {n}
          </button>
        ))}
      </p>
      <ul className="shelf-list public">
        {shown.map(({ item, copies }) => (
          <li key={item.tmdb_id}>
            <span className="tile">
              <span className="poster">{item.poster_path ? <img src={img(item.poster_path, "w185")} alt="" loading="lazy" /> : <span className="noimg">{item.film_title}</span>}</span>
            </span>
            <div className="shelf-info">
              <span className="t">{item.film_title}</span>
              <span className="dim">{(item.release_date || "").slice(0, 4)}</span>
              {copies.map((c, i) => (
                <span key={i} className="copy-line static">
                  {formatLabel(c.format)}
                  {c.edition ? ` · ${c.edition}` : ""}
                  {c.condition ? ` · ${conditionLabel(c.condition)}` : ""}
                  {c.notes ? ` · ${c.notes}` : ""}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="note" style={{ marginTop: 30 }}>
        Partagé depuis Le Projectionniste.
      </p>
    </>
  );
}
