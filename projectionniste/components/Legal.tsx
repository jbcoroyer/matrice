import Link from "next/link";
import { LEGAL, todo } from "@/lib/brand";

/** Une information à compléter avant le lancement : en surbrillance tant qu'elle est entre crochets. */
export function Fill({ v }: { v: string }) {
  return todo(v) ? <mark className="legal-todo">{v}</mark> : <>{v}</>;
}

/** Mise en page commune des pages légales : titre, date de mise à jour, sections lisibles. */
export function LegalPage({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <article className="legal">
      <Link href="/" className="back">
        ← Retour
      </Link>
      <p className="label">Informations légales</p>
      <h1>{title}</h1>
      <p className="lede">{lede}</p>
      <p className="legal-date">Dernière mise à jour : {LEGAL.updated}</p>
      {children}
      <nav className="legal-nav" aria-label="Pages légales">
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/confidentialite">Confidentialité</Link>
        <Link href="/conditions">Conditions d'utilisation</Link>
      </nav>
    </article>
  );
}
