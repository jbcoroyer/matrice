"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KEYS, store } from "@/lib/store";
import { useProfile } from "./ProfileProvider";
import { SearchBox } from "./SearchBox";

const RUBRIQUES = [
  { href: "/decouvrir", label: "Découvrir" },
  { href: "/watchlist", label: "Watchlist" },
];

function isCurrent(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

function useDarkTheme() {
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
  return [dark, flip] as const;
}

/** Icône profil : portrait, journal, réglages, compte, thème. */
function ProfileMenu() {
  const path = usePathname();
  const { profile, account } = useProfile();
  const [open, setOpen] = useState(false);
  const [dark, flipTheme] = useDarkTheme();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const name = profile?.owner || account?.email?.split("@")[0] || "";
  const initial = name ? name[0].toUpperCase() : "";
  const mine = ["/portrait", "/journal", "/reglages", "/compte"].includes(path);

  return (
    <div className="pmenu" ref={box}>
      <button type="button" className={`avatar${mine ? " on" : ""}`} aria-haspopup="menu" aria-expanded={open} aria-label="Mon profil" onClick={() => setOpen((o) => !o)}>
        {initial || (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          </svg>
        )}
      </button>
      {open ? (
        <div className="pmenu-list" role="menu">
          <div className="pmenu-head">
            <b>{name || "Mon profil"}</b>
            <span>{account && !account.anonymous ? account.email : "Sans compte (ce navigateur)"}</span>
          </div>
          <Link role="menuitem" href="/portrait">
            Portrait
          </Link>
          <Link role="menuitem" href="/journal">
            Journal
          </Link>
          <Link role="menuitem" href="/reglages">
            Réglages
          </Link>
          <Link role="menuitem" href="/compte">
            {account && !account.anonymous ? "Compte" : "Créer un compte / se connecter"}
          </Link>
          <button type="button" role="menuitem" onClick={flipTheme}>
            {dark ? "Thème clair" : "Thème sombre"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Masthead() {
  const path = usePathname();
  return (
    <header className="top">
      <div className="wrap top-in">
        <Link href="/decouvrir" className="brand">
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
          <ProfileMenu />
        </span>
      </div>
    </header>
  );
}
