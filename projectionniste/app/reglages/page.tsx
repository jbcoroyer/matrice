"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, Loader, SecHead } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { importLetterboxd } from "@/lib/letterboxd";
import type { Progress } from "@/lib/profile";
import { clearRecs } from "@/lib/recs";
import { KEYS, store } from "@/lib/store";
import { clearMemo, img, tmdb } from "@/lib/tmdb";
import type { Prefs, Profile, Provider } from "@/lib/types";

function Platforms() {
  const { platforms, updatePrefs } = useProfile();
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
  const toggle = (id: number) =>
    updatePrefs((p) => ({ ...p, platforms: p.platforms.includes(id) ? p.platforms.filter((x) => x !== id) : [...p.platforms, id] }));
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
  const { setProfile, profile, resetToSeed } = useProfile();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (files: File[]) => {
    if (!files.length || busy) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const { profile: p, missed } = await importLetterboxd(files, setProgress);
      setProfile(p);
      setMsg(
        `Import terminé : ${p.lib.seen.length.toLocaleString("fr-FR")} films vus, ${Object.keys(p.lib.rated).length.toLocaleString("fr-FR")} notes, ${p.lib.watchlist.length} en watchlist.` +
          (missed.length ? ` ${missed.length} titres introuvables sur TMDB (${missed.slice(0, 3).join(", ")}${missed.length > 3 ? "…" : ""}).` : ""),
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
        Sur Letterboxd : <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener">Réglages → Données → Exporter</a>. Dépose
        ici l'archive <b>.zip</b> telle quelle (ou <b>watched.csv</b>, <b>ratings.csv</b> et <b>watchlist.csv</b>). Tout est traité dans ton
        navigateur ; tes goûts sont réappris à partir de tes notes.
      </p>
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
      {msg ? <p className="status" style={{ paddingTop: 12 }}>{msg}</p> : null}
      {error ? <ErrorLine error={error} /> : null}
      {profile?.source === "letterboxd" ? (
        <div className="row-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (confirm("Revenir au profil livré avec le site ? Ton import sera oublié (tes réglages restent).")) resetToSeed();
            }}
          >
            Revenir au profil de départ
          </button>
        </div>
      ) : null}
    </>
  );
}

function Backup() {
  const { profile, prefs, setProfile, updatePrefs, toast } = useProfile();
  const file = useRef<HTMLInputElement>(null);
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ app: "projectionniste", v: 2, profile, prefs }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `projectionniste-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const restore = async (f?: File) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text()) as { app?: string; profile?: Profile; prefs?: Prefs };
      if (data.app !== "projectionniste" || !data.profile?.lib) throw new Error();
      setProfile(data.profile);
      if (data.prefs) updatePrefs(() => ({ ...prefs, ...data.prefs }));
      toast("Sauvegarde restaurée");
    } catch {
      toast("Ce fichier n'est pas une sauvegarde du Projectionniste");
    }
    if (file.current) file.current.value = "";
  };
  return (
    <>
      <p className="note">Emporte ton profil, tes plateformes et tes marques (vus, notes, watchlist) vers un autre navigateur.</p>
      <div className="row-actions">
        <button type="button" className="btn" onClick={exportData}>
          Télécharger la sauvegarde
        </button>
        <button type="button" className="btn ghost" onClick={() => file.current?.click()}>
          Restaurer
        </button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
      </div>
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
  const { toast, updatePrefs, status } = useProfile();
  return (
    <div className="view">
      <section className="section">
        <SecHead as="h1" kicker="Coulisses" title="Réglages" aside="Tout est enregistré dans ce navigateur" />
        <div className="settings">
          <div>
            <h2>Mes plateformes</h2>
            <p className="note">Coche tes abonnements : leurs logos passent en premier, et l'option « Sur mes plateformes » filtre chaque rubrique.</p>
            <Platforms />
          </div>
          <div>
            <h2>Mettre à jour depuis Letterboxd</h2>
            {status === "ready" ? <LetterboxdImport /> : <Loader text="Lecture de l'historique…" />}
            <h2>Sauvegarde</h2>
            <Backup />
            <h2>Films écartés</h2>
            <Hidden />
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
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  if (!confirm("Effacer tes marques locales (vus, notes, watchlist ajoutée, films écartés) ? Tes plateformes sont conservées.")) return;
                  updatePrefs((p) => ({ ...p, hidden: [], wlAdd: [], wlDel: [], seen: {} }));
                  store.del(KEYS.recs);
                  toast("Marques locales effacées");
                }}
              >
                Effacer mes marques
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
