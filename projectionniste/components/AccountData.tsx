"use client";

import { useEffect, useRef, useState } from "react";
import { deleteAccount } from "@/lib/auth";
import { removeAllPhotos } from "@/lib/collection";
import { errorText } from "@/lib/errors";
import { collectData, download, journalCsv } from "@/lib/export";
import { useProfile } from "./ProfileProvider";

const WORD = "SUPPRIMER";

/** Mes données : exporter tout ce que Filmable garde sur toi, ou supprimer le compte (définitif). */
export function AccountData() {
  const { sb, userId, account, toast } = useProfile();
  const [busy, setBusy] = useState<"json" | "csv" | null>(null);
  const [asking, setAsking] = useState(false);

  const run = async (kind: "json" | "csv") => {
    if (!sb || !userId) return;
    setBusy(kind);
    try {
      const data = await collectData(sb, userId, account?.email ?? null);
      const day = new Date().toISOString().slice(0, 10);
      if (kind === "json") download(`filmable-donnees-${day}.json`, JSON.stringify(data, null, 2), "application/json");
      else download(`filmable-journal-${day}.csv`, journalCsv(data.journal), "text/csv;charset=utf-8");
      toast(kind === "json" ? "Export téléchargé : toutes tes données" : "Export téléchargé : ton journal");
    } catch (e) {
      toast(`Échec de l'export : ${errorText(e)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <p className="note">
        Tout ce que Filmable garde sur toi t'appartient. Tu peux le récupérer à tout moment : un fichier complet (films vus, notes, journal, listes, collection, parcours) et ton journal en tableau
        (CSV).
      </p>
      <div className="row-actions">
        <button type="button" className="btn" disabled={!!busy} onClick={() => run("json")}>
          {busy === "json" ? "Préparation…" : "Exporter toutes mes données"}
        </button>
        <button type="button" className="btn ghost" disabled={!!busy} onClick={() => run("csv")}>
          {busy === "csv" ? "Préparation…" : "Exporter mon journal (CSV)"}
        </button>
      </div>
      <div className="danger-zone">
        <h3>Supprimer mon compte</h3>
        <p className="note">Efface définitivement ton compte et toutes tes données, immédiatement. Il n'y a pas de retour possible : exporte-les d'abord si tu veux les garder.</p>
        <button type="button" className="btn danger" onClick={() => setAsking(true)}>
          Supprimer mon compte…
        </button>
      </div>
      {asking ? <DeleteDialog onClose={() => setAsking(false)} /> : null}
    </>
  );
}

function DeleteDialog({ onClose }: { onClose: () => void }) {
  const { sb, userId } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => ref.current?.showModal(), []);

  const go = async () => {
    if (!sb || !userId || word.trim().toUpperCase() !== WORD) return;
    setBusy(true);
    setError(null);
    try {
      // les photos d'exemplaires sont dans le stockage : on les retire d'abord (le reste part avec le compte)
      await removeAllPhotos(sb, userId).catch(() => {});
      await deleteAccount(sb);
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith("projo.")) localStorage.removeItem(k);
        sessionStorage.clear();
      } catch {}
      location.href = "/?compte=supprime";
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="del-title" onClose={onClose} onCancel={onClose}>
      <h2 id="del-title">Supprimer ton compte ?</h2>
      <p>Cette action est <b>définitive</b>. Seront effacés, tout de suite :</p>
      <ul className="del-list">
        <li>ton compte (adresse email et mot de passe) et ton nom affiché ;</li>
        <li>tes films vus, notes, coups de cœur et ta liste à voir ;</li>
        <li>ton journal et tes critiques ;</li>
        <li>tes listes, ta collection (avec ses photos), tes disques cherchés et tes parcours.</li>
      </ul>
      <label className="block">
        Pour confirmer, écris <b>{WORD}</b>
        <input className="input" value={word} autoComplete="off" autoCapitalize="characters" onChange={(e) => setWord(e.target.value)} aria-label={`Écrire ${WORD} pour confirmer`} />
      </label>
      {error ? (
        <p className="status err" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dialog-actions">
        <span style={{ flex: 1 }} />
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
          Annuler
        </button>
        <button type="button" className="btn danger" disabled={busy || word.trim().toUpperCase() !== WORD} onClick={go}>
          {busy ? "Suppression…" : "Supprimer définitivement"}
        </button>
      </div>
    </dialog>
  );
}
