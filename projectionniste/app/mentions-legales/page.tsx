import { Fill, LegalPage } from "@/components/Legal";
import { BRAND, LEGAL } from "@/lib/brand";

export default function Page() {
  return (
    <LegalPage title="Mentions légales" lede={`Qui édite ${BRAND.name}, qui l'héberge, et d'où viennent les données sur les films.`}>
      <section>
        <h2>Éditeur du site</h2>
        <p>
          <b>
            <Fill v={LEGAL.editor.name} />
          </b>{" "}
          — <Fill v={LEGAL.editor.status} />.
        </p>
        <p>
          Adresse : <Fill v={LEGAL.editor.address} />
          <br />
          Contact : <Fill v={LEGAL.editor.email} />
        </p>
        <p>L'éditeur est aussi le directeur de la publication. {BRAND.name} ne contient aucun contenu public rédigé par des tiers : chaque compte est privé.</p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          <b>Site :</b> {LEGAL.host.site.name}, <Fill v={LEGAL.host.site.address} /> (
          <a href={LEGAL.host.site.url} rel="noopener">
            {LEGAL.host.site.url.replace("https://", "")}
          </a>
          ).
        </p>
        <p>
          <b>Base de données, comptes et fichiers :</b> {LEGAL.host.data.name} (
          <a href={LEGAL.host.data.url} rel="noopener">
            {LEGAL.host.data.url.replace("https://", "")}
          </a>
          ), hébergée dans la région : <Fill v={LEGAL.host.data.region} />.
        </p>
      </section>

      <section>
        <h2>Données sur les films</h2>
        <p>
          Les fiches de films, les affiches, les photos et les filmographies viennent de{" "}
          <a href="https://www.themoviedb.org/" rel="noopener">
            TMDB
          </a>
          . <b>Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.</b> Les images et les textes appartiennent à leurs auteurs et à leurs ayants droit.
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Le nom {BRAND.name}, son logo, la mise en page et le code de l'application sont la propriété de l'éditeur. Les sélections de films (mouvements, palmarès, saisons) et les textes
          d'accompagnement sont des créations de l'éditeur. Les contenus que tu ajoutes (notes, critiques, listes, photos de ta collection) restent les tiens.
        </p>
      </section>

      <section>
        <h2>Responsabilité</h2>
        <p>
          {BRAND.name} est fourni gratuitement, sans garantie de disponibilité continue : le service est en phase de test (bêta). L'éditeur s'efforce d'indiquer des informations exactes sur les films mais
          ne peut pas garantir l'absence d'erreur des données fournies par TMDB.
        </p>
      </section>

      <section>
        <h2>Données personnelles et contact</h2>
        <p>
          Le détail des données collectées et de tes droits est dans la <a href="/confidentialite">politique de confidentialité</a>. Pour toute question ou réclamation :{" "}
          <Fill v={LEGAL.editor.email} />.
        </p>
      </section>
    </LegalPage>
  );
}
