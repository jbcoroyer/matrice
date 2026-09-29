"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KEYS, store } from "@/lib/store";
import { useProfile } from "./ProfileProvider";
import { Search } from "./icons";
import { SearchBox } from "./SearchBox";

const RUBRIQUES = [
  { href: "/", label: "À la une" },
  { href: "/pour-toi", label: "Pour toi" },
  { href: "/humeurs", label: "Humeurs" },
  { href: "/salles", label: "En salles" },
  { href: "/watchlist", label: "Ma watchlist" },
  { href: "/portrait", label: "Portrait" },
];

function isCurrent(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function Nav({ path, label }: { path: string; label: string }) {
  return (
    <nav className="rubriques" aria-label={label}>
      {RUBRIQUES.map((r) => (
        <Link key={r.href} href={r.href} aria-current={isCurrent(path, r.href) ? "page" : undefined}>
          {r.label}
        </Link>
      ))}
    </nav>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const flip = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set(KEYS.theme, next);
    setDark(!dark);
  };
  return (
    <button type="button" className="icon-btn" onClick={flip} aria-label={dark ? "Passer en thème clair" : "Passer en thème sombre"}>
      {dark === null ? "Thème" : dark ? "Jour" : "Séance"}
    </button>
  );
}

export function Masthead() {
  const path = usePathname();
  const { profile } = useProfile();
  const [date, setDate] = useState("");
  const [mini, setMini] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDate(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setMini(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const owner = profile?.owner;
  return (
    <>
      <header className="wrap mast">
        <div className="mast-top">
          <span className="date">{date}</span>
          <span className="tools">
            <ThemeToggle />
            <Link className="icon-btn" href="/reglages" aria-current={path === "/reglages" ? "page" : undefined}>
              Réglages
            </Link>
          </span>
        </div>
        <Link href="/" className="logo" aria-label="Le Projectionniste, accueil">
          <b>Le</b> Projectionniste
        </Link>
        <div className="tagline">
          {profile
            ? owner
              ? `L'édition de ${owner}, composée à partir de ses notes Letterboxd`
              : "Une édition composée à partir de tes notes Letterboxd"
            : " "}
        </div>
        <Nav path={path} label="Rubriques" />
        <div ref={sentinel} />
        <SearchBox />
      </header>

      <div className={`minibar${mini ? " on" : ""}`} aria-hidden={!mini} inert={!mini}>
        <div className="wrap">
          <Link href="/" className="mlogo">
            <b>Le</b> Projectionniste
          </Link>
          <Nav path={path} label="Rubriques (barre compacte)" />
          <span className="tools">
            <button
              type="button"
              className="icon-btn"
              aria-label="Rechercher"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => document.querySelector<HTMLInputElement>(".mast .searchbar input")?.focus(), 350);
              }}
            >
              <Search />
            </button>
          </span>
        </div>
      </div>
    </>
  );
}
