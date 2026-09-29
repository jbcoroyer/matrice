import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section view">
      <div className="sec-head">
        <div>
          <div className="kicker">Bobine introuvable</div>
          <h1>
            Cette page <i>n'est pas à l'affiche</i>
          </h1>
        </div>
      </div>
      <p className="lede">Le film ou la page demandée n'existe pas, ou plus. La cabine de projection vous propose autre chose.</p>
      <div className="row-actions">
        <Link className="btn primary" href="/">
          Retour à la une
        </Link>
        <Link className="btn" href="/pour-toi">
          Ma sélection
        </Link>
      </div>
    </section>
  );
}
