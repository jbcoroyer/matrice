import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="sec-head">
        <h1>Page introuvable</h1>
      </div>
      <p className="lede">Ce film ou cette page n'existe pas, ou plus.</p>
      <div className="row-actions">
        <Link className="btn primary" href="/">
          Retour à l'accueil
        </Link>
        <Link className="btn" href="/pour-toi">
          Ma sélection
        </Link>
      </div>
    </section>
  );
}
