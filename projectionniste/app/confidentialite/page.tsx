import { Fill, LegalPage } from "@/components/Legal";
import { BRAND, LEGAL } from "@/lib/brand";

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" lede={`Ce que ${BRAND.name} garde sur toi, pourquoi, chez qui, et comment le récupérer ou l'effacer.`}>
      <section>
        <h2>En bref</h2>
        <ul>
          <li>Ton compte est <b>privé</b> : personne d'autre que toi ne voit tes films, tes notes, ton journal ni ta collection (sauf si tu partages un lien de collection, voir plus bas).</li>
          <li>Aucune publicité, aucun pistage, aucune revente de données.</li>
          <li>Tu peux <b>tout exporter</b> et <b>tout supprimer</b>, en quelques clics, dans Paramètres → Mes données.</li>
        </ul>
      </section>

      <section>
        <h2>Qui est responsable</h2>
        <p>
          Le responsable du traitement est l'éditeur du site : <b><Fill v={LEGAL.editor.name} /></b>, joignable à <Fill v={LEGAL.editor.email} />.
        </p>
      </section>

      <section>
        <h2>Les données que nous gardons</h2>
        <ul>
          <li><b>Ton compte :</b> adresse email et mot de passe (conservé sous forme chiffrée, jamais lisible), nom affiché si tu en donnes un.</li>
          <li><b>Ce que tu enregistres :</b> films vus, notes, coups de cœur, liste à voir, entrées de journal (date, note, critique, étiquettes), listes, parcours suivis.</li>
          <li><b>Ta collection :</b> tes disques (support, édition, état, notes, date d'achat, prêts), les disques que tu cherches et, si tu en ajoutes, les photos de tes exemplaires.</li>
          <li><b>Si tu importes Letterboxd :</b> le contenu de ton export, rangé dans les mêmes catégories. Le fichier lui-même n'est pas conservé.</li>
          <li><b>Réglages :</b> par exemple « présentation déjà vue ».</li>
        </ul>
        <p>Nous ne demandons ni date de naissance, ni téléphone, ni localisation. Le service est réservé aux personnes de 15 ans et plus.</p>
      </section>

      <section>
        <h2>Pourquoi, et sur quelle base</h2>
        <p>
          Ces données servent uniquement à faire fonctionner ton compte : afficher ton journal, calculer l'avancée de tes parcours, ranger ta collection (exécution du service que tu demandes en créant un
          compte). L'adresse IP est utilisée de façon passagère, en mémoire, pour limiter les abus du service (intérêt légitime de sécurité) ; elle n'est pas conservée.
        </p>
      </section>

      <section>
        <h2>Chez qui elles sont stockées</h2>
        <ul>
          <li><b>{LEGAL.host.data.name}</b> : comptes, base de données et photos (région : <Fill v={LEGAL.host.data.region} />).</li>
          <li><b>{LEGAL.host.site.name}</b> : hébergement du site.</li>
          <li><b><Fill v={LEGAL.host.email.name} /></b> : envoi des emails (confirmation de compte, mot de passe oublié).</li>
          <li><b>TMDB</b> : fournit les informations et les affiches des films. Les recherches passent par nos serveurs ; en revanche, <b>ton navigateur charge les affiches directement depuis TMDB</b>, qui voit donc ton adresse IP, comme n'importe quel site qui affiche des images.</li>
        </ul>
        <p>Ces prestataires peuvent traiter des données hors de l'Union européenne ; ces transferts sont encadrés par les garanties prévues par le RGPD.</p>
      </section>

      <section>
        <h2>Cookies et stockage dans ton navigateur</h2>
        <p>
          {BRAND.name} n'utilise <b>aucun cookie publicitaire ni de mesure d'audience</b>. Le navigateur garde seulement ce qui est nécessaire : ta session de connexion, tes préférences (thème, rangement de
          l'étagère, présentation déjà vue) et une mémoire temporaire de quelques informations sur les films pour aller plus vite. Ces éléments ne quittent pas ton appareil et ne demandent pas de consentement.
        </p>
      </section>

      <section>
        <h2>Lien de partage de ta collection</h2>
        <p>
          Si tu actives le partage, une page affiche les disques de ta collection à toute personne qui a le lien. Elle ne montre jamais tes films vus, tes notes, ton journal ni tes prêts. Tu peux la
          désactiver à tout moment.
        </p>
      </section>

      <section>
        <h2>Combien de temps</h2>
        <p>
          Tant que ton compte existe. Quand tu le supprimes, tes données et tes photos sont effacées immédiatement de la base. Des copies de sauvegarde de l'hébergeur peuvent subsister pendant une durée
          limitée avant d'être écrasées : <Fill v={LEGAL.backups} />.
        </p>
      </section>

      <section>
        <h2>Tes droits</h2>
        <ul>
          <li><b>Accès et portabilité :</b> Paramètres → Mes données → « Exporter toutes mes données » (fichier JSON) et « Exporter mon journal » (CSV).</li>
          <li><b>Effacement :</b> Paramètres → Mes données → « Supprimer mon compte ». C'est immédiat et définitif.</li>
          <li><b>Rectification :</b> tu modifies toi-même tes films, notes, journal, collection et ton nom affiché.</li>
          <li><b>Opposition, limitation, question :</b> écris à <Fill v={LEGAL.editor.email} />. Nous répondons dans un délai d'un mois.</li>
        </ul>
        <p>
          Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la CNIL (
          <a href="https://www.cnil.fr/fr/plaintes" rel="noopener">
            cnil.fr/fr/plaintes
          </a>
          ).
        </p>
      </section>

      <section>
        <h2>Changements</h2>
        <p>Si cette politique change de façon importante, nous te le dirons dans l'appli avant son application. La date de dernière mise à jour est en haut de la page.</p>
      </section>
    </LegalPage>
  );
}
