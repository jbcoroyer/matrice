"use client";

import { useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/errors";
import { FORMATS, fetchExtra, saveItem, type Format } from "@/lib/collection";
import { filmRow } from "@/lib/db";
import { mapLimit, img, tmdb } from "@/lib/tmdb";
import type { Movie, Paged } from "@/lib/types";
import { Check } from "./icons";
import { useProfile } from "./ProfileProvider";

type Row = { line: string; query: string; year: number | null; format: Format; hit: Movie | null; on: boolean };

const LAST_FORMAT = "projo.lastFormat";
const lastFormat = (): Format => {
  try {
    const f = localStorage.getItem(LAST_FORMAT);
    if (f && FORMATS.some((x) => x.k === f)) return f as Format;
  } catch {}
  return "bluray";
};

/** « Heat (1995) — 4K » → titre, année, support. */
function parseLine(line: string, fallback: Format): { query: string; year: number | null; format: Format } {
  let t = line.trim();
  let format = fallback;
  const f = t.match(/[—–\-|\[(]\s*(4k|uhd|blu[- ]?ray|bd|dvd|vhs|laser ?disc)\s*[\])]?\s*$/i);
  if (f) {
    const k = f[1].toLowerCase();
    format = /4k|uhd/.test(k) ? "4k" : /blu|bd/.test(k) ? "bluray" : /dvd/.test(k) ? "dvd" : /vhs/.test(k) ? "vhs" : "laserdisc";
    t = t.slice(0, f.index).trim();
  }
  const y = t.match(/\(?\b((?:19|20)\d\d)\b\)?\s*$/);
  let year: number | null = null;
  if (y && t.length > 6) {
    year = +y[1];
    t = t.slice(0, y.index).trim();
  }
  return { query: t.replace(/[—–\-|]+$/, "").trim(), year, format };
}

/** Ajouter plusieurs disques d'un coup : un film par ligne, Filmable retrouve chacun et tu confirmes. */
export function BulkAdd({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { sb, userId, toast, refreshOwned, owned } = useProfile();
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [format, setFormat] = useState<Format>(lastFormat());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => ref.current?.showModal(), []);

  const find = async () => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 80);
    if (!lines.length) return;
    setBusy(true);
    setError(null);
    try {
      const found = await mapLimit(lines, 4, async (line): Promise<Row> => {
        const p = parseLine(line, format);
        const r = await tmdb<Paged<Movie>>("search/movie", { query: p.query, year: p.year ?? undefined, include_adult: false }).catch(() => null);
        const hit = r?.results?.find((m) => m.poster_path || (m.vote_count ?? 0) > 5) ?? null;
        return { line, query: p.query, year: p.year, format: p.format, hit, on: !!hit };
      });
      setRows(found);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const picked = (rows ?? []).filter((r) => r.on && r.hit);
  const add = async () => {
    if (!sb || !userId || !picked.length) return;
    setBusy(true);
    setError(null);
    try {
      let n = 0;
      await mapLimit(picked, 3, async (r) => {
        const film = r.hit!;
        const extra = await fetchExtra(film.id).catch(() => null);
        await saveItem(
          sb,
          userId,
          filmRow({ id: film.id, title: film.title, release_date: film.release_date, poster_path: film.poster_path, backdrop_path: film.backdrop_path, genre_ids: film.genre_ids }),
          { format: r.format, packaging: "standard", edition: null, publisher: null, edition_no: null, edition_of: null, sealed: false, condition: null, notes: null, acquired_on: null, lent_to: null, lent_on: null, photo_path: null },
          undefined,
          extra,
        );
        n++;
      });
      toast(`${n} disque${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""} à ta collection`, undefined, { label: "Parcours", href: "/parcours" });
      refreshOwned();
      onDone();
      onClose();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="dialog bulk" onClose={onClose} onCancel={onClose}>
      <h2>Ajouter plusieurs disques</h2>
      {!rows ? (
        <>
          <p className="note">
            Un film par ligne. Tu peux préciser l'année et le support : « Heat (1995) — 4K ». Sans support, ce sera :
          </p>
          <select value={format} onChange={(e) => setFormat(e.target.value as Format)} aria-label="Support par défaut">
            {FORMATS.map((f) => (
              <option key={f.k} value={f.k}>
                {f.l}
              </option>
            ))}
          </select>
          <textarea
            className="input bulk-text"
            rows={9}
            autoFocus
            aria-label="Liste des films"
            placeholder={"Heat (1995) — 4K\nLe Samouraï\nChungking Express — Blu-ray\nPlaytime"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </>
      ) : (
        <>
          <p className="note">Vérifie ce que j'ai trouvé : décoche ce qui ne va pas.</p>
          <ul className="bulk-list">
            {rows.map((r, i) => (
              <li key={i} className={r.hit ? "" : "miss"}>
                <label>
                  <input type="checkbox" checked={r.on} disabled={!r.hit} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
                  <span className="thumb">{r.hit?.poster_path ? <img src={img(r.hit.poster_path, "w92")} alt="" /> : null}</span>
                  <span className="bulk-t">
                    {r.hit ? (
                      <>
                        <b>{r.hit.title}</b> <span className="dim">{(r.hit.release_date || "").slice(0, 4)}</span>
                        {owned.has(r.hit.id) ? <span className="dim"> · déjà dans ta collection</span> : null}
                      </>
                    ) : (
                      <>
                        <b>« {r.query} »</b> <span className="dim">introuvable</span>
                      </>
                    )}
                  </span>
                  <select value={r.format} disabled={!r.hit} aria-label={`Support de ${r.query}`} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, format: e.target.value as Format } : x)))}>
                    {FORMATS.map((f) => (
                      <option key={f.k} value={f.k}>
                        {f.l}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      {error ? (
        <p className="status err" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dialog-actions">
        {rows ? (
          <button type="button" className="link-btn quiet" onClick={() => setRows(null)}>
            ← Modifier la liste
          </button>
        ) : null}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn ghost" onClick={onClose}>
          Annuler
        </button>
        {rows ? (
          <button type="button" className="btn primary" disabled={busy || !picked.length} onClick={add}>
            <Check />
            {busy ? "Ajout…" : `Ajouter ${picked.length} disque${picked.length > 1 ? "s" : ""}`}
          </button>
        ) : (
          <button type="button" className="btn primary" disabled={busy || !text.trim()} onClick={find}>
            {busy ? "Je cherche…" : "Chercher"}
          </button>
        )}
      </div>
    </dialog>
  );
}
