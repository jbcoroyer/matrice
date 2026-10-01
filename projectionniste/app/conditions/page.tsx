import { Fill, LegalPage } from "@/components/Legal";
import { BRAND, LEGAL } from "@/lib/brand";

export default function Page() {
  return (
    <LegalPage title="Conditions d'utilisation" lede={`Les règles simples pour utiliser ${BRAND.name}.`}>
      <section>
        <h2>Le service</h2>
        <p>
          {BRAND.name} est un carnet de cinéma : tenir son journal, suivre des parcours (cinéastes, mouvements, palmarès), ranger sa collection de disques. Il est <b>gratuit</b> et actuellement en phase de test
          (bêta) : des fonctions peuvent changer, être corrigées ou retirées.
        </p>
      </section>

      <section>
        <h2>Ton compte</h2>
        <ul>
          <li>Il faut avoir 15 ans ou plus, et une adresse email valide.</li>
          <li>Tu es responsable de ton mot de passe. Ne le partage pas.</li>
          <li>Un compte est personnel. Les données que tu y enregistres sont privées.</li>
          <li>Tu peux supprimer ton compte à tout moment dans Paramètres → Mes données.</li>
        </ul>
      </section>

      <section>
        <h2>Ce que tu enregistres</h2>
        <p>
          Tes notes, critiques, listes, photos et informations de collection restent <b>à toi</b>. Tu nous autorises seulement à les stocker et à les afficher dans ton compte. N'ajoute pas de contenu illégal
          ou portant atteinte aux droits d'autrui (par exemple, une photo où figure une personne qui ne le souhaite pas).
        </p>
      </section>

      <section>
        <h2>Usage correct</h2>
        <ul>
          <li>Pas de tentative d'accéder aux données d'un autre compte, de perturber le service ou de contourner ses protections.</li>
          <li>Pas d'envoi automatisé massif de requêtes : l'accès aux données de films est limité pour protéger le service.</li>
          <li>L'éditeur peut suspendre un compte en cas d'abus, après avertissement lorsque c'est possible.</li>
        </ul>
      </section>

      <section>
        <h2>Disponibilité et responsabilité</h2>
        <p>
          Le service est fourni « en l'état », sans garantie de disponibilité permanente. Pense à exporter régulièrement tes données si elles te sont précieuses. L'éditeur ne peut pas être tenu pour responsable
          d'une perte de données ou d'une interruption, sauf faute lourde, dans les limites permises par la loi.
        </p>
      </section>

      <section>
        <h2>Données sur les films</h2>
        <p>
          Les informations et les images viennent de TMDB. <b>Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.</b>
        </p>
      </section>

      <section>
        <h2>Modifications, droit applicable, contact</h2>
        <p>
          Ces conditions peuvent évoluer ; tu seras prévenu des changements importants. Elles sont régies par le droit français. Pour toute question : <Fill v={LEGAL.editor.email} />. Voir aussi les{" "}
          <a href="/mentions-legales">mentions légales</a> et la <a href="/confidentialite">politique de confidentialité</a>.
        </p>
      </section>
    </LegalPage>
  );
}
