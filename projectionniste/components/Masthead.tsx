"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { KEYS, store } from "@/lib/store";
import { SearchBox } from "./SearchBox";

const RUBRIQUES = [
  { href: "/", label: "Accueil" },
  { href: "/pour-toi", label: "Pour toi" },
  { href: "/humeurs", label: "Humeurs" },
  { href: "/salles", label: "En salles" },
  { href: "/journal", label: "Journal" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portrait", label: "Portrait" },
];

function isCurrent(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
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
    <button type="button" className="tool" onClick={flip} aria-label={dark ? "Passer en thème clair" : "Passer en thème sombre"}>
      {dark === null ? "Thème" : dark ? "Clair" : "Sombre"}
    </button>
  );
}

export function Masthead() {
  const path = usePathname();
  return (
    <header className="top">
      <div className="wrap top-in">
        <Link href="/" className="brand">
          Le Projectionniste
        </Link>
        <nav className="rubriques" aria-label="Rubriques">
          {RUBRIQUES.map((r) => (
            <Link key={r.href} href={r.href} aria-current={isCurrent(path, r.href) ? "page" : undefined}>
              {r.label}
            </Link>
          ))}
        </nav>
        <SearchBox />
        <span className="tools">
          <ThemeToggle />
          <Link className="tool" href="/reglages" aria-current={path === "/reglages" ? "page" : undefined}>
            Réglages
          </Link>
        </span>
      </div>
    </header>
  );
}
