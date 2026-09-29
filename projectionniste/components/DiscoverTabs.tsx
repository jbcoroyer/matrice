"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/decouvrir", label: "Pour toi" },
  { href: "/decouvrir/humeurs", label: "Humeurs" },
  { href: "/decouvrir/salles", label: "En salles" },
  { href: "/decouvrir/populaires", label: "Populaires" },
];

export function DiscoverTabs() {
  const path = usePathname();
  const current = (href: string) => (href === "/decouvrir" ? path === href : path.startsWith(href));
  return (
    <nav className="tabs" aria-label="Découvrir">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={current(t.href) ? "page" : undefined} scroll={false}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
