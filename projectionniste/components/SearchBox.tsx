"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { yearOf } from "@/lib/format";
import { img, tmdb } from "@/lib/tmdb";
import type { Paged } from "@/lib/types";
import { Search } from "./icons";

type Hit =
  | { media_type: "movie"; id: number; title: string; release_date?: string; poster_path?: string | null; popularity?: number; vote_count?: number }
  | { media_type: "person"; id: number; name: string; profile_path?: string | null; known_for_department?: string; popularity?: number };

const DEPT: Record<string, string> = { Directing: "Réalisation", Acting: "Interprétation", Writing: "Scénario", Camera: "Image", Sound: "Musique", Production: "Production", Editing: "Montage" };

/** Recherche instantanée : films et personnes, navigation au clavier, « / » pour y aller. */
export function SearchBox({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(-1);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      // Échap ferme les suggestions où que soit le focus (par exemple après « Réessayer »)
      if (e.key === "Escape") setOpen(false);
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    const term = q.trim();
    setFailed(false);
    if (term.length < 2) {
      setHits(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      tmdb<Paged<Hit & { media_type: string }>>("search/multi", { query: term, include_adult: false })
        .then((r) => {
          if (!alive) return;
          const list = (r.results || [])
            .filter((h): h is Hit => h.media_type === "movie" || h.media_type === "person")
            .filter((h) => (h.media_type === "movie" ? h.poster_path || (h.vote_count || 0) > 5 : h.profile_path))
            .slice(0, 7);
          setHits(list);
          setSel(-1);
        })
        .catch(() => alive && (setHits(null), setFailed(true)));
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, attempt]);

  const hrefOf = (h: Hit) => (h.media_type === "movie" ? `/film/${h.id}` : `/personne/${h.id}`);
  const goAll = () => {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/recherche?q=${encodeURIComponent(term)}`);
  };
  const go = (h: Hit) => {
    setOpen(false);
    setQ("");
    input.current?.blur();
    router.push(hrefOf(h));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = hits?.length ?? 0;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setSel((s) => (s + 1 > n ? 0 : s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s - 1 < 0 ? n : s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits && sel >= 0 && sel < n) go(hits[sel]);
      else goAll();
    } else if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    }
  };

  const showList = open && q.trim().length >= 2 && (hits !== null || failed);

  return (
    <div className="searchbar" ref={box} role="search">
      <div className="field-line">
        <Search />
        <input
          ref={input}
          type="search"
          value={q}
          placeholder="Chercher un film, un cinéaste…"
          autoComplete="off"
          aria-label="Rechercher un film ou une personne"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={sel >= 0 ? `${listId}-${sel}` : undefined}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <kbd aria-hidden="true">/</kbd>
      </div>
      {showList ? (
        <ul className="suggest" id={listId} role="listbox">
          {failed ? (
            <li className="empty" role="alert">
              La recherche est indisponible pour le moment.{" "}
              <button type="button" className="link-btn" onClick={() => setAttempt((a) => a + 1)}>
                Réessayer
              </button>
            </li>
          ) : null}
          {hits && hits.length === 0 ? <li className="empty">Rien trouvé pour « {q.trim()} ».</li> : null}
          {(hits ?? []).map((h, i) => (
            <li key={`${h.media_type}${h.id}`} id={`${listId}-${i}`} role="option" aria-selected={sel === i} onMouseEnter={() => setSel(i)}>
              <a
                href={hrefOf(h)}
                onClick={(e) => {
                  e.preventDefault();
                  go(h);
                }}
              >
                {h.media_type === "movie" ? (
                  <>
                    <span className="thumb">{h.poster_path ? <img src={img(h.poster_path, "w92")} alt="" loading="lazy" /> : null}</span>
                    <span>
                      <span className="t">{h.title}</span>
                      <span className="s"> {yearOf(h)}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="thumb round">{h.profile_path ? <img src={img(h.profile_path, "w92")} alt="" loading="lazy" /> : null}</span>
                    <span>
                      <span className="t">{h.name}</span>
                      <span className="s"> {DEPT[h.known_for_department || ""] || "Personne"}</span>
                    </span>
                  </>
                )}
              </a>
            </li>
          ))}
          {hits ? (
            <li id={`${listId}-${hits.length}`} role="option" aria-selected={sel === hits.length} onMouseEnter={() => setSel(hits.length)}>
              <button type="button" className="all" onClick={goAll}>
                Tous les résultats pour « {q.trim()} »
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
