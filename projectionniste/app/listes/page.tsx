"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListCover, ListDialog } from "@/components/ListDialogs";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, Loader, ProfileGate } from "@/components/ui";
import { myLists, type ListSummary } from "@/lib/lists";

type Sort = "recent" | "title" | "size";

function Lists() {
  const { sb, userId } = useProfile();
  const router = useRouter();
  const [lists, setLists] = useState<ListSummary[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  const load = useCallback(() => {
    if (!sb || !userId) return;
    setError(null);
    myLists(sb, userId).then(setLists, setError);
  }, [sb, userId]);
  useEffect(load, [load]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    const l = (lists ?? []).filter((x) => !k || x.title.toLowerCase().includes(k) || x.description?.toLowerCase().includes(k));
    if (sort === "title") l.sort((a, b) => a.title.localeCompare(b.title, "fr"));
    if (sort === "size") l.sort((a, b) => b.count - a.count);
    return l;
  }, [lists, q, sort]);

  return (
    <section className="section">
      <div className="page-head">
        <h1>
          Mes <span>listes</span>
        </h1>
        <button type="button" className="btn primary" onClick={() => setCreating(true)}>
          + Nouvelle liste
        </button>
      </div>
      {error ? (
        <ErrorLine error={error} onRetry={load} />
      ) : !lists ? (
        <Loader text="Chargement des listes…" />
      ) : !lists.length ? (
        <div className="gate">
          <h2>Aucune liste pour l'instant</h2>
          <p className="note">
            Regroupe des films comme tu veux : un classement de tes préférés, un cycle à montrer à quelqu'un, les films d'un festival… Une liste peut
            rester privée ou être partagée par un simple lien.
          </p>
          <div className="row-actions">
            <button type="button" className="btn primary" onClick={() => setCreating(true)}>
              Créer ma première liste
            </button>
            <Link className="btn ghost" href="/parametres#import">
              Importer mes listes Letterboxd
            </Link>
          </div>
        </div>
      ) : (
        <>
          {lists.length > 6 ? (
            <div className="filterbar">
              <input className="input search-in" type="search" placeholder="Chercher une liste" value={q} onChange={(e) => setQ(e.target.value)} />
              <label>
                Trier
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="recent">Modifiées récemment</option>
                  <option value="title">Titre</option>
                  <option value="size">Nombre de films</option>
                </select>
              </label>
            </div>
          ) : null}
          <ul className="lists">
            {shown.map((l) => (
              <li key={l.id}>
                <Link href={`/listes/${l.id}`}>
                  <ListCover posters={l.posters} />
                  <span className="t">{l.title}</span>
                </Link>
                <span className="dim">
                  {l.count} film{l.count > 1 ? "s" : ""}
                  {l.ranked ? " · classée" : ""} · {l.is_public ? "publique" : "privée"}
                </span>
                {l.description ? <p className="desc">{l.description}</p> : null}
              </li>
            ))}
          </ul>
          {!shown.length ? <p className="status">Aucune liste ne correspond.</p> : null}
        </>
      )}
      {creating ? <ListDialog onClose={() => setCreating(false)} onSaved={(l) => router.push(`/listes/${l.id}?ajout=1`)} /> : null}
    </section>
  );
}

export default function Page() {
  return (
    <ProfileGate>
      <Lists />
    </ProfileGate>
  );
}
