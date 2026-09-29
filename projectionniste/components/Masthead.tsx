"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "./ProfileProvider";
import { SearchBox } from "./SearchBox";

const RUBRIQUES = [
  { href: "/decouvrir", label: "Découvrir" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/listes", label: "Listes" },
  { href: "/collection", label: "Collection" },
];

function isCurrent(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

/** Icône profil : mon profil, journal, paramètres, déconnexion. */
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
  const mine = ["/portrait", "/journal", "/parametres"].includes(path);
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
  if (status !== "ready")
    return (
      <header className="top">
        <div className="wrap top-in">
          <Link href="/" className="brand">
            Le Projectionniste
          </Link>
        </div>
      </header>
    );
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
