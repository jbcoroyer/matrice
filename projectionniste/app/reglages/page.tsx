"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, Loader, SecHead } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { importLetterboxd, type Progress } from "@/lib/letterboxd";
import { clearRecs } from "@/lib/recs";
import { clearMemo, img, tmdb } from "@/lib/tmdb";
import type { Provider } from "@/lib/types";

function Platforms() {
  const { platforms, updateSettings } = useProfile();
  const [all, setAll] = useState(false);
  const list = useAsync(
    async () => {
      const r = await tmdb<{ results: Provider[] & { display_priorities?: Record<string, number> }[] }>("watch/providers/movie", { watch_region: "FR" });
      return (r.results as (Provider & { display_priorities?: Record<string, number> })[]).sort(
        (a, b) => (a.display_priorities?.FR ?? 99) - (b.display_priorities?.FR ?? 99),
      );
    },
    [],
  );
  const toggle = (id: number) => updateSettings({ platforms: platforms.has(id) ? [...platforms].filter((x) => x !== id) : [...platforms, id] });
  if (list.error) return <ErrorLine error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Loader text="Chargement des plateformes…" />;
  const shown = all ? list.data : list.data.filter((p, i) => i < 24 || platforms.has(p.provider_id));
  return (
    <>
      <div className="plat-grid">
        {shown.map((p) => (
          <button key={p.provider_id} type="button" className="plat" aria-pressed={platforms.has(p.provider_id)} onClick={() => toggle(p.provider_id)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(p.logo_path, "w92")} alt="" loading="lazy" />
            {p.provider_name}
          </button>
        ))}
      </div>
      {list.data.length > 24 ? (
        <div className="row-actions">
          <button type="button" className="link-btn" onClick={() => setAll((a) => !a)}>
            {all ? "Moins de plateformes" : `Toutes les plateformes (${list.data.length})`}
          </button>
        </div>
      ) : null}
    </>
  );
}

function LetterboxdImport() {
  const { sb, userId, reload, profile } = useProfile();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (files: File[]) => {
    if (!files.length || busy || !sb || !userId) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const r = await importLetterboxd(sb, userId, files, setProgress);
      await reload();
      const n = (x: number) => x.toLocaleString("fr-FR");
      setMsg(
        `Import terminé : ${n(r.watched)} films vus, ${n(r.rated)} notes, ${n(r.diary)} entrées de journal (dont ${n(r.reviews)} critiques), ` +
          `${n(r.watchlist)} en watchlist, ${n(r.lists)} listes.` +
          (r.missed.length ? ` ${r.missed.length} titres introuvables sur TMDB (${r.missed.slice(0, 3).join(", ")}${r.missed.length > 3 ? "…" : ""}).` : ""),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <>
      <p className="note">
        Sur Letterboxd : <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener">Settings → Data → Export your data</a>. Dépose
        ici l'archive <b>.zip</b> telle quelle. On récupère ton journal (dates, revisionnages, étiquettes), tes notes, tes critiques, tes likes, ta
        watchlist, tes listes et tes films favoris, et on réapprend tes goûts à partir de tes notes. Tu peux réimporter plus tard sans créer de doublons.
      </p>
      {profile?.importedAt ? <p className="note">Dernier import : {new Date(profile.importedAt).toLocaleString("fr-FR")}.</p> : null}
      <label
        className={`drop${over ? " over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          run([...e.dataTransfer.files]);
        }}
      >
        <input ref={input} type="file" accept=".zip,.csv,text/csv,application/zip" multiple disabled={busy} onChange={(e) => run([...(e.target.files ?? [])])} />
        <b>{busy ? "Import en cours…" : "Déposer l'export Letterboxd"}</b>
        <span className="note">ou cliquer pour choisir le fichier</span>
      </label>
      {progress ? (
        <>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
            <i style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          <p className="note">
            {progress.phase}… {progress.total > 1 ? `${progress.done.toLocaleString("fr-FR")} / ${progress.total.toLocaleString("fr-FR")}` : ""}
          </p>
        </>
      ) : null}
      {msg ? <p className="status">{msg}</p> : null}
      {error ? <ErrorLine error={error} /> : null}
    </>
  );
}

function Hidden() {
  const { hidden, titles, toggleHidden } = useProfile();
  if (!hidden.size) return <p className="note">Aucun film écarté. Le bouton « Pas pour moi » d'une fiche retire un film de toutes les sélections.</p>;
  return (
    <div className="hidden-list">
      {[...hidden].map((id) => (
        <button key={id} type="button" title="Proposer à nouveau" onClick={() => toggleHidden({ id, title: titles[id] || `Film ${id}` })}>
          {titles[id] || `Film ${id}`}
        </button>
      ))}
    </div>
  );
}

export default function Page() {
  const { toast, status } = useProfile();
  return (
    <section className="section">
      <SecHead as="h1" title="Réglages" />
      <div className="settings">
        <div>
          <h2>Mes plateformes</h2>
          <p className="note">Coche tes abonnements : leurs logos passent en premier, et l'option « Sur mes plateformes » filtre chaque rubrique.</p>
          {status === "ready" ? <Platforms /> : <Loader text="Chargement…" />}
        </div>
        <div>
          <h2 id="import">Importer depuis Letterboxd</h2>
          {status === "ready" ? <LetterboxdImport /> : <Loader text="Chargement…" />}
          <h2>Films écartés</h2>
          <Hidden />
          <h2>Ton compte</h2>
          <p className="note">
            Pour l'instant, tes données sont rattachées à ce navigateur (session anonyme). Si tu effaces les données du site ou changes de navigateur,
            tu ne les retrouveras pas : les comptes (email, Google) arrivent bientôt et permettront de les récupérer partout.
          </p>
          <h2>Entretien</h2>
          <p className="note">
            La sélection « <Link href="/pour-toi">Pour toi</Link> » est recalculée chaque jour. Vider le cache force un recalcul immédiat.
          </p>
          <div className="row-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                clearRecs();
                clearMemo();
                toast("Cache vidé : la sélection sera recalculée");
              }}
            >
              Vider le cache
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
