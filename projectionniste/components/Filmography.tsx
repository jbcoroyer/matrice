"use client";

import { useMemo, useState } from "react";
import { FilmGrid } from "./FilmGrid";
import { useProfile } from "./ProfileProvider";
import { SecHead, SkeletonGrid } from "./ui";
import type { PersonCredit, PersonCredits, Ranked } from "@/lib/types";

type Tab = "Directing" | "Acting" | "Writing" | "Other";
const TABS: { k: Tab; l: string }[] = [
  { k: "Directing", l: "Réalisation" },
  { k: "Acting", l: "Interprétation" },
  { k: "Writing", l: "Scénario" },
  { k: "Other", l: "Autres postes" },
];

const JOB_FR: Record<string, string> = {
  "Director of Photography": "Image", "Original Music Composer": "Musique", Editor: "Montage", Producer: "Production",
  "Executive Producer": "Production exécutive", Screenplay: "Scénario", Writer: "Scénario", Novel: "Roman", Story: "Histoire",
};

function bucket(credits: PersonCredits) {
  const b: Record<Tab, PersonCredit[]> = { Directing: [], Acting: credits.cast, Writing: [], Other: [] };
  for (const c of credits.crew) {
    if (c.job === "Director") b.Directing.push(c);
    else if (c.department === "Writing") b.Writing.push(c);
    else b.Other.push(c);
  }
  return b;
}

/** Filmographie d'une personne, par poste ; on voit ce qu'on a déjà vu. */
export function Filmography({ credits, dept, name }: { credits: PersonCredits; dept: string; name: string }) {
  const { status, seen } = useProfile();
  const b = useMemo(() => bucket(credits), [credits]);
  const first = (TABS.find((t) => t.k === dept && b[t.k].length) || TABS.find((t) => b[t.k].length))?.k ?? "Acting";
  const [tab, setTab] = useState<Tab>(first);
  const [sort, setSort] = useState<"pop" | "date">("pop");
  const [unseen, setUnseen] = useState(false);

  const list = useMemo(() => {
    const byId = new Map<number, Ranked>();
    for (const c of b[tab]) {
      if (!c.release_date && !c.poster_path) continue;
      const prev = byId.get(c.id);
      const note = tab === "Acting" ? c.character : tab === "Directing" ? undefined : JOB_FR[c.job || ""] || c.job;
      if (prev) {
        if (note && prev._note && !prev._note.includes(note)) prev._note += ` · ${note}`;
        continue;
      }
      byId.set(c.id, { ...c, _note: note || undefined });
    }
    let l = [...byId.values()];
    if (unseen) l = l.filter((m) => !seen.has(m.id));
    if (sort === "date") l.sort((a, b) => (b.release_date || "9999").localeCompare(a.release_date || "9999"));
    if (sort === "pop") l.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    return l;
  }, [b, tab, sort, unseen, seen]);

  const all = new Set(b[tab].map((c) => c.id));
  const seenCount = [...all].filter((id) => seen.has(id)).length;

  return (
    <section className="section">
      <SecHead title="Filmographie" />
      {status === "ready" && all.size ? (
        <p className="tally">
          Tu en as vu <b>{seenCount}</b> sur {all.size}.{" "}
          {seenCount < all.size ? "Les autres t'attendent." : "Tu as tout vu."}
        </p>
      ) : null}
      <div className="filterbar">
        <div className="seg" role="group" aria-label="Poste">
          {TABS.filter((t) => b[t.k].length).map((t) => (
            <button key={t.k} type="button" aria-pressed={tab === t.k} onClick={() => setTab(t.k)}>
              {t.l}
            </button>
          ))}
        </div>
        <label>
          Tri
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="pop">Plus connus</option>
            <option value="date">Plus récents</option>
          </select>
        </label>
        {status === "ready" ? (
          <label>
            <input type="checkbox" checked={unseen} onChange={(e) => setUnseen(e.target.checked)} /> Pas encore vus
          </label>
        ) : null}
        <span className="count">{list.length} films</span>
      </div>
      {status === "loading" ? (
        <SkeletonGrid n={10} />
      ) : list.length ? (
        <FilmGrid key={`${tab}|${sort}|${unseen}`} list={list} />
      ) : (
        <p className="status">Rien à afficher ici.</p>
      )}
    </section>
  );
}
