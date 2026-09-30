"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DiaryList } from "@/components/DiaryEntries";
import { useProfile } from "@/components/ProfileProvider";
import { WatchedFilms } from "@/components/WatchedFilms";
import { EmptyState, ErrorLine, Loader, ProfileGate, SecHead, StartActions } from "@/components/ui";
import { JournalButton } from "@/components/QuickLog";
import { DIARY_EVENT, diaryIndex, listEntries, type DiaryEntry, type DiaryFilter } from "@/lib/diary";

const PAGE = 100;

function monthLabel(d: string | null) {
  if (!d) return "Sans date";
  const s = new Date(d.slice(0, 7) + "-15T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Journal() {
  const { sb, userId } = useProfile();
  // filtres de départ venus d'un lien (bilan de l'année) : ?etiquette=…&annee=…
  const [filter, setFilter] = useState<DiaryFilter | null>(null);
  const [tab, setTab] = useState<"journal" | "vus">("journal");
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("onglet") === "vus") setTab("vus");
    setFilter({ tag: q.get("etiquette") || undefined, year: +(q.get("annee") || 0) || undefined });
  }, []);
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [done, setDone] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [index, setIndex] = useState<Awaited<ReturnType<typeof diaryIndex>> | null>(null);

  const load = useCallback(
    async (from: number, prev: DiaryEntry[]) => {
      if (!sb || !userId || !filter) return;
      const rows = await listEntries(sb, userId, filter, from, PAGE);
      setDone(rows.length < PAGE);
      setEntries([...prev, ...rows]);
    },
    [sb, userId, filter],
  );

  const refresh = useCallback(() => {
    setError(null);
    load(0, []).catch(setError);
    if (sb && userId) diaryIndex(sb, userId).then(setIndex, () => {});
  }, [load, sb, userId]);

  useEffect(() => {
    setEntries(null);
    refresh();
  }, [refresh]);
  // une entrée ajoutée depuis le bouton « Journaliser » apparaît tout de suite, sans vider la liste
  useEffect(() => {
    window.addEventListener(DIARY_EVENT, refresh);
    return () => window.removeEventListener(DIARY_EVENT, refresh);
  }, [refresh]);

  const set = (patch: DiaryFilter) => setFilter((f) => ({ ...f, ...patch }));
  const f = filter ?? {};
  const active = !!(f.year || f.tag || f.reviews || f.rewatch || f.minRating);

  // regroupement par mois
  const groups: { label: string; items: DiaryEntry[] }[] = [];
  for (const e of entries ?? []) {
    const label = monthLabel(e.watched_on);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(e);
    else groups.push({ label, items: [e] });
  }

  return (
    <section className="section">
      <SecHead
        as="h1"
        title="Journal"
        aside={
          index ? (
            <span className="aside">
              {index.total.toLocaleString("fr-FR")} visionnages
              {index.years.length ? (
                <>
                  {" · "}
                  <Link className="link" href={`/bilan?annee=${f.year ?? index.years[0][0]}`}>
                    Bilan {f.year ?? index.years[0][0]}
                  </Link>
                </>
              ) : null}
            </span>
          ) : undefined
        }
      />
      <div className="tabs-row">
        <div className="seg" role="radiogroup" aria-label="Affichage">
          <button type="button" role="radio" aria-checked={tab === "journal"} onClick={() => setTab("journal")}>
            Journal
          </button>
          <button type="button" role="radio" aria-checked={tab === "vus"} onClick={() => setTab("vus")}>
            Films vus
          </button>
        </div>
        <JournalButton className="in-page" />
      </div>
      {tab === "vus" ? (
        <WatchedFilms />
      ) : (
        <>
      <div className="filterbar">
        <label>
          Année
          <select value={f.year ?? ""} onChange={(e) => set({ year: e.target.value ? +e.target.value : undefined })}>
            <option value="">Toutes</option>
            {index?.years.map(([y, n]) => (
              <option key={y} value={y}>
                {y} ({n})
              </option>
            ))}
          </select>
        </label>
        <label>
          Étiquette
          <select value={f.tag ?? ""} onChange={(e) => set({ tag: e.target.value || undefined })}>
            <option value="">Toutes</option>
            {index?.tags.map(([t, n]) => (
              <option key={t} value={t}>
                {t} ({n})
              </option>
            ))}
          </select>
        </label>
        <label>
          Note
          <select value={f.minRating ?? ""} onChange={(e) => set({ minRating: e.target.value ? +e.target.value : undefined })}>
            <option value="">Toutes</option>
            <option value="5">5 ★</option>
            <option value="4.5">4,5 ★ et plus</option>
            <option value="4">4 ★ et plus</option>
            <option value="3">3 ★ et plus</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={!!f.reviews} onChange={(e) => set({ reviews: e.target.checked || undefined })} /> Avec critique
        </label>
        <label>
          <input type="checkbox" checked={!!f.rewatch} onChange={(e) => set({ rewatch: e.target.checked || undefined })} /> Revisionnages
        </label>
        {active ? (
          <button type="button" className="link-btn" onClick={() => setFilter({})}>
            Tout afficher
          </button>
        ) : null}
      </div>

      {error ? (
        <ErrorLine error={error} onRetry={refresh} />
      ) : !entries ? (
        <Loader text="Chargement du journal…" />
      ) : !entries.length ? (
        active ? (
          <p className="status">Aucun visionnage ne correspond à ces filtres.</p>
        ) : (
          <EmptyState title="Ton journal est vide" actions={<StartActions />}>
            Chaque film que tu journalises garde sa date, ta note et ta critique. C'est aussi ce qui nourrit ton bilan de l'année.
          </EmptyState>
        )
      ) : (
        <>
          {groups.map((g) => (
            <div key={g.label} className="month">
              <h2>{g.label}</h2>
              <DiaryList entries={g.items} withFilm onChange={refresh} onTag={(t) => set({ tag: t })} />
            </div>
          ))}
          {!done ? (
            <div className="more">
              <button
                type="button"
                className="btn ghost"
                disabled={more}
                onClick={() => {
                  setMore(true);
                  load(entries.length, entries)
                    .catch(setError)
                    .finally(() => setMore(false));
                }}
              >
                {more ? "Chargement…" : "Voir plus"}
              </button>
            </div>
          ) : null}
        </>
      )}
        </>
      )}
    </section>
  );
}

export default function Page() {
  return (
    <ProfileGate>
      <Journal />
    </ProfileGate>
  );
}
