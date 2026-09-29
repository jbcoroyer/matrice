"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Compass, Disc, List, Search } from "./icons";
import { useProfile } from "./ProfileProvider";
import { SearchBox } from "./SearchBox";

const RUBRIQUES = [
  { href: "/decouvrir", label: "Découvrir", icon: Compass },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/listes", label: "Listes", icon: List },
  { href: "/collection", label: "Collection", icon: Disc },
];

function isCurrent(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

function Brand() {
  return (
    <Link href="/decouvrir" className="brand" aria-label="Filmable, accueil">
      Film<span>able</span>
    </Link>
  );
}

/** Pastille profil : mon profil, journal, bilan, paramètres, déconnexion. */
function ProfileMenu() {
  const path = usePathname();
  const { profile, account, sb } = useProfile();
  const [open, setOpen] = useState(false);
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
  const mine = ["/portrait", "/journal", "/bilan", "/parametres"].includes(path);
  const item = (href: string, label: string) => (
    <Link role="menuitem" href={href} aria-current={path === href ? "page" : undefined}>
      {label}
    </Link>
  );

  return (
    <div className="pmenu" ref={box}>
      <button type="button" className={`avatar${mine ? " on" : ""}`} aria-haspopup="menu" aria-expanded={open} aria-label="Mon profil" onClick={() => setOpen((o) => !o)}>
        {name ? name[0].toUpperCase() : "?"}
      </button>
      {open ? (
        <div className="pmenu-list" role="menu">
          <div className="pmenu-head">
            <b>{name}</b>
            <span>{account?.email}</span>
          </div>
          {item("/portrait", "Mon profil")}
          {item("/journal", "Journal")}
          {item("/bilan", "Bilan de l'année")}
          {item("/parametres", "Paramètres")}
          <hr />
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await sb?.auth.signOut();
              location.href = "/";
            }}
          >
            Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Masthead() {
  const path = usePathname();
  const { status } = useProfile();
  const [solid, setSolid] = useState(false);

  // l'en-tête flotte sur l'image du film, puis se pose quand on fait défiler
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`top${solid ? " solid" : ""}`}>
      <div className="wrap top-in">
        <Brand />
        {status === "ready" ? (
          <>
            <nav className="rubriques" aria-label="Rubriques">
              {RUBRIQUES.map((r) => (
                <Link key={r.href} href={r.href} aria-current={isCurrent(path, r.href) ? "page" : undefined}>
                  {r.label}
                </Link>
              ))}
            </nav>
            <span className="tools">
              <SearchBox />
              <ProfileMenu />
            </span>
          </>
        ) : null}
      </div>
    </header>
  );
}

/** Barre d'onglets flottante sur mobile. */
export function TabBar() {
  const path = usePathname();
  const { status } = useProfile();
  if (status !== "ready") return null;
  const tabs = [...RUBRIQUES, { href: "/recherche", label: "Chercher", icon: Search }];
  return (
    <nav className="tabbar" aria-label="Rubriques">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={isCurrent(path, t.href) ? "page" : undefined}>
          <t.icon />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
