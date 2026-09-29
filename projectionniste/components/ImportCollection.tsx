"use client";

import { useEffect, useRef, useState } from "react";
import type { CollectionItem } from "@/lib/collection";
import { CSV_MODEL, importRows, readRows, type ImportReport, type ImportRow } from "@/lib/collection-import";
import { useProfile } from "./ProfileProvider";

/** Importe une collection depuis un CSV : un exemplaire par ligne, films retrouvés sur TMDB. */
export function ImportCollection({ existing, onClose, onDone }: { existing: CollectionItem[]; onClose: () => void; onDone: () => void }) {
  const { sb, userId, refreshOwned } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [unread, setUnread] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => ref.current?.showModal(), []);

  const pick = async (f?: File) => {
    if (!f) return;
    setError(null);
    setReport(null);
    try {
      const r = readRows(await f.text());
      setName(f.name);
      setRows(r.rows);
      setUnread(r.unread);
      if (!r.rows.length && !r.unread.length) setError("Aucune ligne lisible : il faut au moins une colonne « Titre » et une colonne « Format ».");
    } catch {
      setError("Ce fichier n'a pas pu être lu.");
    }
  };

  const run = async () => {
    if (!sb || !userId || !rows) return;
    setBusy(true);
    setDone(0);
    try {
      setReport(await importRows(sb, userId, rows, existing, setDone));
      refreshOwned();
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const model = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + CSV_MODEL], { type: "text/csv" }));
    a.download = "modele-collection.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <h2>
        Importer ma collection <span className="dim">CSV</span>
      </h2>
      {report ? (
        <>
          <p className="status">
            <b>{report.added}</b> exemplaire{report.added > 1 ? "s" : ""} ajouté{report.added > 1 ? "s" : ""}
            {report.duplicates ? `, ${report.duplicates} déjà présent${report.duplicates > 1 ? "s" : ""}` : ""}.
          </p>
          {report.missing.length ? (
            <p className="note">
              Introuvables sur TMDB : {report.missing.slice(0, 12).join(", ")}
              {report.missing.length > 12 ? `… (+${report.missing.length - 12})` : ""}. Ajoute-les à la main avec « Ajouter un exemplaire ».
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="note">
            Un exemplaire par ligne. Colonnes reconnues : <b>Titre</b>, <b>Format</b> (4K, Blu-ray, DVD, Steelbook, VHS…), et en option Année, Édition, Éditeur, État, Notes, Acquis le. Séparateur virgule ou point-virgule.{" "}
            <button type="button" className="link-btn" onClick={model}>
              Télécharger un modèle
            </button>
          </p>
          <label className="btn" style={{ marginTop: 6 }}>
            {name ? `Changer de fichier (${name})` : "Choisir un fichier CSV"}
            <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {rows ? (
            <p className="status">
              {rows.length} ligne{rows.length > 1 ? "s" : ""} prête{rows.length > 1 ? "s" : ""} à importer.
              {unread.length ? ` ${unread.length} ignorée${unread.length > 1 ? "s" : ""} : ${unread.slice(0, 3).join(" · ")}${unread.length > 3 ? "…" : ""}` : ""}
            </p>
          ) : null}
        </>
      )}
      {error ? <p className="status err">{error}</p> : null}
      {busy && rows ? (
        <div className="progress" role="progressbar" aria-valuenow={done} aria-valuemax={rows.length}>
          <i style={{ width: `${(done / rows.length) * 100}%` }} />
        </div>
      ) : null}
      <div className="dialog-actions">
        <span style={{ flex: 1 }} />
        <button type="button" className="btn ghost" onClick={onClose}>
          {report ? "Fermer" : "Annuler"}
        </button>
        {!report ? (
          <button type="button" className="btn primary" disabled={busy || !rows?.length} onClick={run}>
            {busy ? `Import… ${done} / ${rows?.length}` : "Importer"}
          </button>
        ) : null}
      </div>
    </dialog>
  );
}
