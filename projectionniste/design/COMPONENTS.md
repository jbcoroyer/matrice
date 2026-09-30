# Composants signature

## Navigation (`components/Masthead.tsx`, `components/QuickLog.tsx`)

- Ordinateur : Découvrir · **Journal** · Watchlist · Listes · Collection, puis recherche, bouton
  crème **Journaliser** et avatar.
- Mobile : barre flottante Découvrir · Journal · **+** · Watchlist · Collection. Le + est un rond
  crème un peu surélevé ; la loupe est dans l'en-tête ; Listes est dans le menu du profil.
- **Journaliser** ouvre la recherche d'un film (Entrée choisit le premier résultat), puis
  « J'ai vu… », puis une notification avec « Voir dans le journal ».

## Fiche film (`app/film/[id]/page.tsx`)

- Image du film en fond pleine largeur, fondue vers le noir ; affiche arrondie posée dessus.
- Libellés (genres · année · durée · visa), titre en deux graisses, « Un film de … · avec … »
  (liens vers les personnes).
- Barre de notes : ta note en pastille crème pleine avec étoile, note TMDB, moyenne des membres.
- Actions en pilules : Ajouter au journal, Vu, Watchlist, note en étoiles, coup de cœur, liste,
  collection, menu « … » (top 5, partager, envie de l'avoir en disque).
- Synopsis + **Qui l'a vu** (membres, moyenne, notes ; chacun peut se masquer).
- **Casting et réalisation** en photos, tout cliquable.
- **Générique** : rôles alignés à droite, noms à gauche, comme un générique de fin ; logos des
  **studios** (en blanc) qui mènent à `/studio/[id]`.
- Critiques des membres. Pas de « films proches » : pas de recommandation dans Filmable.
- Sans compte : la fiche est lisible, les actions sont remplacées par « Créer un compte ».

## À la une (`app/decouvrir/page.tsx`)

Les films les plus regardés de la semaine (TMDB), les mêmes pour tout le monde. Carrousel : affiche centrale grande, voisines en retrait et inclinées ; fond d'ambiance tiré de
l'affiche active ; texte à gauche (titre deux graisses, libellés, note TMDB, résumé),
points de pagination, flèches clavier et glisser sur mobile.

## Cinémathèque (`app/collection/page.tsx`, `components/CollectionCard.tsx`, `components/Classeur.tsx`)

La collection **physique**, séparée de ce qu'on a vu (les films vus vivent dans le journal et le
profil). Planches de départ : `design/collection/`.

**Distinguer vu et possédé, partout dans l'appli**
- **Vu** : immatériel. Pastille œil (avec la note si elle existe) en haut à droite de l'affiche.
- **Watchlist** : pastille marque-page.
- **Possédé** : un objet. Sur les affiches (Découvrir, Watchlist, recherche…) : filet crème dans
  l'affiche et **languette de billet** avec le format (`Poster` + `.own-tab`) ; dans la collection :
  la **carte**.

**Carte de collection** (`CollectionCard`, `.tcg`)
- L'affiche reste entière ; le cadre est une matière : noir mat (DVD, Blu-ray, VHS), **argent
  satiné** (4K, steelbook, Criterion…), **or crème** (collector, éditions limitées ou numérotées).
- Médaillon de format (4K, BD, DVD…), sceau d'édition, cartouche (titre en deux graisses, ligne
  « genre · réalisateur · année »), numéro de collection « N° 142 / 187 », médaillon de note :
  crème avec la note si le film est vu, anneau pointillé s'il ne l'a jamais été.
- Scellé : film plastique + étiquette « Scellé ». Prêté : affiche assombrie + « Prêté à … ».
- L'affiche retourne la carte (verso : édition, éditeur, numéro, état, achat, prêt, notes, photo,
  visionnages) ; le titre ouvre la fiche du film. Survol : inclinaison ≤ 7° et un reflet crème.
- **Exception validée à la charte** : l'argent et l'or crème n'existent que sur la carte, comme un
  vrai foil. Pas d'arc-en-ciel holographique, pas de halo coloré. Les jetons `--f-*` et `--card-*`
  de `globals.css` portent cette matière, identique en thème clair et sombre.

**Page Collection** (`app/collection/page.tsx`, `lib/shelf.ts`) : une vidéothèque, pas un tableau.
- En tête : « Ma cinémathèque », une phrase (« 187 films, 203 exemplaires »), **Ajouter** et un menu ⋯
  (Partager, Registre, Classeur des réalisateurs, provisoire). Une ligne rappelle les prêts s'il y en a.
- Jusqu'à 12 films : tout est de face (l'affiche dans le cadre de sa matière), sans aucun outil.
- Au-delà : **Dernières entrées** de face, puis **l'étagère** : une seule, continue, un dos par
  exemplaire, des **intercalaires** (lettre du réalisateur, du titre, décennie ou année d'entrée)
  et un index des lettres. « Ranger par » apparaît à partir de 30 films.
- **Une seule recherche**, qui comprend aussi les mots de collectionneur : 4K, Blu-ray, DVD, VHS,
  steelbook, collector, scellé, prêté, pas vu (« kubrick 4k »).
- Un boîtier (ou une affiche) ouvre la **feuille** du film (`?film=`) : la carte posée à gauche,
  un exemplaire par ligne (édition, éditeur, n°, état, prêt, photo, Modifier), « Ajouter une autre
  édition », et une seule ligne sur le visionnage.
- **Tu cherches** : les envies, en liste de brocante (titre, pointillés, « Je l'ai trouvé »).
- **Registre** (`/collection/registre`) : supports, éditeurs, entrées par année, éditions numérotées.
  Les chiffres ne sont plus sur la page principale.
- Plus de numéro de collection (il changeait à chaque suppression), plus de modes Vitrine / Étagère.

## Écran d'accueil (`components/AuthScreen.tsx`)

Mur d'affiches du moment incliné et assombri, grand mot-marque « **Film**able », formulaire
dans une carte en verre.

## Vocabulaire

- Pas d'**indice** ni de recommandation : décision du propriétaire, pour rester ouvert à tout le cinéma.
- **Note** : celle que tu as donnée. Pastille pleine crème avec étoile, « ta note ».
- **Coup de cœur** : le cœur d'un film (fiche, journal). « J'aime » ne sert que pour les critiques.
- **Mon profil** (`/portrait`) : chiffres, top 5, répartition des notes, **highlights** (réalisateur,
  acteur, genre, époque les plus vus, film le mieux noté : grands noms en typographie, pas de graphique).
- **Profil public** (`/u/pseudo`) : nom, présentation, top 5, listes et critiques publiques.

## Premier lancement et pages vides (`components/ui.tsx`)

- **Guide de démarrage** (`Onboarding`, en haut de Découvrir) : tant qu'aucun film n'est vu, noté
  ni en watchlist. « Bienvenue sur **Filmable** », trois gestes numérotés en grands chiffres légers
  (importer Letterboxd, journaliser un premier film, noter ce qu'on connaît), sans cartes ni icônes.
  « Masquer ce guide » le range (mémorisé dans le navigateur).
- **Page vide** (`EmptyState`) : un titre, une phrase qui dit à quoi sert la page, et de quoi la
  remplir (`StartActions` : Journaliser un film, Importer mon Letterboxd ; ou l'action propre à la
  page : Parcourir les tendances, Ajouter mon premier exemplaire, Créer ma première liste).
  Utilisé par Journal, Films vus, Watchlist, Collection, Bilan, Mon profil (« Ce que tu aimes ») et Listes.

## Erreurs, confirmations, session (`lib/errors.ts`, `components/Chrome.tsx`)

- **Erreurs** : tout message montré passe par `errorText(e)` : réseau, session expirée, droits refusés,
  doublon, délai sont traduits ; un texte technique anglais devient « Une erreur est survenue.
  Réessaie dans un instant. ». Jamais de message brut de Supabase ou du navigateur.
- **Session expirée** : le client Supabase signale toute réponse 401 d'un utilisateur connecté ;
  un bandeau sous l'en-tête (« Ta session a expiré… », bouton **Se reconnecter**) reste affiché, et
  l'écran de connexion rappelle pourquoi. Il disparaît à la reconnexion.
- **Suppressions** : le journal et la collection n'ont plus de confirmation : c'est fait, avec une
  notification **Annuler** (l'entrée ou l'exemplaire revient tel quel ; la photo n'est effacée
  qu'après 8 s). Les suppressions qui ne se rejouent pas (liste, commentaire) et le passage d'une
  liste en public demandent confirmation dans une fenêtre de l'appli (`useProfile().confirm`),
  jamais `window.confirm`. Échap refuse.
- **Recherche** : si TMDB ne répond pas, les suggestions, la page de résultats et la fenêtre
  « Quel film ? » disent que la recherche est indisponible et proposent **Réessayer**.
  Échap ferme les suggestions où que soit le focus.
