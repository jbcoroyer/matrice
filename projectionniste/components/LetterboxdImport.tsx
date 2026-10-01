"use client";

import { useRef, useState } from "react";
import { importLetterboxd, type Progress } from "@/lib/letterboxd";
import { useProfile } from "./ProfileProvider";
import { ErrorLine } from "./ui";

/** Import de l'export Letterboxd (archive .zip) : explications, dépôt du fichier, progression, résultat. */
export function LetterboxdImport({ onDone }: { onDone?: () => void }) {
  const { sb, userId, reload } = useProfile();
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
      onDone?.();
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
      <ol className="steps">
        <li>
          Sur Letterboxd, ouvre{" "}
          <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener">
            Settings → Data
          </a>{" "}
          et clique sur <b>Export your data</b>.
        </li>
        <li>Dépose ici l'archive <b>.zip</b> reçue, sans la décompresser.</li>
      </ol>
      <p className="note">
        Journal, notes, critiques, likes, watchlist, listes et favoris sont repris. Réimporter plus tard met à jour sans doublons.
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
      {msg ? <p className="status">{msg}</p> : null}
      {error ? <ErrorLine error={error} /> : null}
    </>
  );
}

