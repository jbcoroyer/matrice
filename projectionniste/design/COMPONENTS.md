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
- **Où aller ensuite** (`FilmDoors`) : jusqu'à trois portes (même cinéaste, la saga dans l'ordre,
  une sélection dont le film fait partie), chacune avec un photogramme, où tu en es et le film par
  lequel continuer. Pas de « films proches » calculés : des liens qu'on peut expliquer.
- Critiques des membres.
- Sans compte : la fiche est lisible, les actions sont remplacées par « Créer un compte ».

## Découvrir (`app/decouvrir/page.tsx`, `lib/discover.ts`, `components/Today.tsx`, `Doors.tsx`, `Tonight.tsx`)

Rôle : **mettre sous les yeux un film, un cinéaste ou un coin de cinéma, avec une raison vraie de
s'y intéresser aujourd'hui.** Une page qui se termine (pas de rangées, pas de flux infini, pas de
filtres, pas de note prédite). Les tirages dépendent du jour et du compte : la page change le
lendemain, pas à chaque visite ; elle se recalcule dès qu'un film est vu.

- **Aujourd'hui** (`Today`) : une seule proposition à la fois, en grand, sur le photogramme du film
  (fond fondu vers la gauche). Au-dessus du titre, une **phrase de raison** vérifiable, avec des liens :
  « Tu as vu *Zodiac* samedi. *David Fincher* a aussi réalisé, en 1995 : ». Trois idées par jour au
  plus, de trois natures : continuer (cycle en cours, cinéaste du dernier film vu), découvrir (coup
  de cœur écrit à la main dans `lib/picks.ts`, anniversaire de sortie « il y a 50 ans cette semaine »),
  ressortir (un film possédé jamais vu, un film qui attend dans la watchlist). « Une autre idée », puis
  « C'est tout pour aujourd'hui ». Compte neuf : coups de cœur et anniversaires.
- **Reprendre** (`TrailLine`) : si on explorait tout à l'heure, le fil « Zodiac › David Fincher › Se7en ».
- **Populaires du moment** : six affiches, le classement **du jour** de TMDB (ce qui bouge le plus
  aujourd'hui : regardé, cherché, noté, en salles ou non), sans les films déjà vus. « Tous les
  classements » mène à `/decouvrir/populaires`.
- **Ce soir ?** (`Tonight`, `lib/ask.ts`) : de quoi choisir un film, de trois façons.
  - **Une phrase** dans une barre : « Un film dans le style de Scorsese, mafia, après 2010 ». Filmable
    la lit lui-même (pas d'IA extérieure) : genres, thèmes (mots-clés TMDB), pays, époques (« après
    2010 », « années 80 », « avant 1980 », « récent », « classique »), durées (« moins de 2 h »,
    « court »), « dans ma watchlist », « possédé », cinéastes (« dans le style de… » = ses films
    servent de repères ; « de… », « avec… » = ses films). Il montre ce qu'il a compris en **étiquettes
    qu'on retire d'un clic** (« J'ai compris : Dans le style de Martin Scorsese × Mafia × Après 2010 × »)
    et signale ce qu'il n'a pas compris. Trop précis : il lâche d'abord les thèmes, puis les genres, et le dit.
  - **Quatre envies** : Moins de 1 h 40 · Possédé, pas vu · Dans ma watchlist · Un classique (masquées si
    impossibles).
  - **Trois exemples de phrases** tirés pour la journée (« Essaie : … »), qu'on clique.
  - Une réponse = **un** film (photogramme, raison, fiche, watchlist), « Un autre » (3 pour une envie, 5
    pour une phrase). Pour « dans le style de X », une ligne propose aussi un film de X lui-même.
- **Trois chemins** (`Paths`) : des **portes** (photogramme 16:9, libellé, titre deux graisses, une
  phrase, « Et ensuite : *Se7en* · 1995 ») vers une page d'ensemble : un cinéaste que tu regardes et dont
  il te reste des films, une sélection proche des années que tu regardes, et **un écart** assumé
  (« Aucun de ces 17 films parmi les 212 que tu as vus »). Compte neuf : « Des portes d'entrée ».
  « Tout le catalogue » mène à `/ensembles`.
- Les anciennes humeurs redirigent vers une sélection (« Noir coréen » → Renouveau coréen) ou vers
  Découvrir. Après un film journalisé, le message propose « Et ensuite ? ».

## Cinémathèque (`app/collection/page.tsx`, `components/CollectionCard.tsx`)

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
  « genre · réalisateur · année »), support en pied de carte, médaillon de note :
  crème avec la note si le film est vu, anneau pointillé s'il ne l'a jamais été.
- Scellé : film plastique + étiquette « Scellé ». Prêté : affiche assombrie + « Prêté à … ».
- Sur la page publique, l'affiche retourne la carte (verso : édition, éditeur, numéro, état, achat,
  notes, photo). Dans la collection, la carte est posée dans la feuille du film. Survol : inclinaison
  ≤ 7° et un reflet crème.
- **Exception validée à la charte** : l'argent et l'or crème n'existent que sur la carte, comme un
  vrai foil. Pas d'arc-en-ciel holographique, pas de halo coloré. Les jetons `--f-*` et `--card-*`
  de `globals.css` portent cette matière, identique en thème clair et sombre.

**Page Collection** (`app/collection/page.tsx`, `lib/shelf.ts`) : une vidéothèque, pas un tableau.
- En tête : « Ma cinémathèque », une phrase (« 187 films, 203 exemplaires »), **Ajouter** et un menu ⋯
  (Partager, Registre, Ouvrir un rayon). Une ligne rappelle les prêts s'il y en a.
- Jusqu'à 12 films : tout est de face (l'affiche dans le cadre de sa matière), sans aucun outil.
- Au-delà : **Dernières entrées** de face, puis **l'étagère** : une seule, continue, un dos par
  exemplaire dont la **couleur de l'affiche monte à mi-hauteur** (possédé) ou **remplit tout le dos avec
  un petit œil** (possédé et vu), comme les rayons ; un dos par
  exemplaire, rangée par **ordre alphabétique des titres** (sans l'article : « Le Mépris » à M),
  des **intercalaires** (lettre du titre, du réalisateur, décennie ou année d'entrée) et un index
  des lettres. « Ranger par » (Titre, Réalisateur, Année, Entrée) apparaît à partir de 30 films.
- **Une seule recherche**, qui comprend aussi les mots de collectionneur : 4K, Blu-ray, DVD, VHS,
  steelbook, collector, scellé, prêté, pas vu (« kubrick 4k »).
- Un boîtier (ou une affiche) ouvre la **feuille** du film (`?film=`) : la carte posée à gauche,
  un exemplaire par ligne (édition, éditeur, n°, état, prêt, photo, Modifier), « Ajouter une autre
  édition », et une seule ligne sur le visionnage.
- **Tu cherches** : les envies, en liste de brocante (titre, pointillés, « Je l'ai trouvé »).
- **Registre** (`/collection/registre`) : supports, éditeurs, entrées par année, éditions numérotées.
  Les chiffres ne sont plus sur la page principale.
- Plus de numéro de collection (il changeait à chaque suppression), plus de modes Vitrine / Étagère.
- **Support et édition** sont deux choix : support (4K UHD, Blu-ray, DVD, VHS, LaserDisc) et
  édition (Standard, Steelbook, Coffret, Mediabook, Digibook, Collector). « Numérique » n'est plus
  proposé. Les anciens « Steelbook » / « Collector » sont devenus des Blu-ray de cette édition,
  marqués « support à vérifier ».

## Rayons et cycles (`lib/sets.ts`, `lib/editorial.ts`, `components/SetView.tsx`, `Rayons.tsx`, `Cycles.tsx`)

Un **ensemble** de films (la filmographie d'un cinéaste, une saga, un studio, une sélection
éditoriale) se suit de deux façons, jamais confondues :
- **Rayon** (posséder) : vit dans la **Collection**. Une étagère avec les boîtiers possédés et des
  **places vides en pointillé** ; « 11 / 14 » en chiffres légers ; pas de barre de progression.
  Plusieurs éditions d'un film comptent pour un. Trois rayons à l'affiche, les autres repliés. Chaque rayon a la largeur de son étagère : les
  courts (Alien, Dogme 95) se rangent **côte à côte**, un long (Oscars) prend la ligne ; une seule
  légende sous l'ensemble. La saga Alien réunit les sept films (TMDB sépare les quatre premiers des préquelles).
  Le but est d'avoir **vu et possédé**, et le rayon **se colore en avançant** : la couleur de l'affiche monte dans le boîtier
  **jusqu'à mi-hauteur** s'il est vu **ou** possédé, et le **remplit entièrement** s'il est vu **et**
  possédé. Un vu porte l'œil ; une place vide vue reste en pointillé, affiche en transparence ; un
  film ni vu ni possédé reste neutre. La couleur vient du film, jamais de l'interface.
  « 2 / 35 possédés · 5 vus · 1 vu et possédé », et une légende sous l'étagère. Les cycles
  pas encore ouverts en rayon sont rappelés sous les rayons. Dans un cycle, « possédé » marque les films qu'on a.
- **Cycle** (voir) : vit dans le **Journal** (onglet Cycles). Un **programme de cinémathèque** :
  une ligne par séance (année, titre, « vu le 12/03/2026 » et la note, ou « à voir · Journaliser »),
  et des cases comme des tickets poinçonnés dans la liste des cycles. « Vu » = `user_films.watched` ;
  le journal date les séances.
- **Page d'un ensemble** (`/ensembles/[clé]`, lisible sans compte) : neutre, comme une fiche. Titre,
  description, **la règle en clair**, puis deux lignes « Dans ta collection : 4 sur 13 · Ouvrir un
  rayon » et « Dans ton parcours : 9 sur 13 · Commencer le cycle ». « Ajuster » permet de ne pas
  compter un film (caméo, film introuvable). Pour une personne : Réalisation · Rôles principaux ·
  Toute la filmographie (sans apparitions, téléfilms, documentaires ni films introuvables).
- **Catalogue** (`/ensembles`) : le même pour tout le monde (Mouvements, Cinémas du monde, Palmarès,
  Studios, Sagas), pas de sélection sous licence. Portes d'entrée : chemins et portes de Découvrir,
  « Où aller ensuite » sur la fiche film, « Rétrospective » (avec « Par où commencer ») sur la fiche
  d'une personne. Chaque page d'ensemble dit **par où commencer** (le film le plus connu que tu n'as
  pas vu ; dans une saga, le suivant dans l'ordre). Les sélections retrouvées sur TMDB sont gardées
  un mois dans le navigateur.
- **Fin** : un rayon complet garde « Complet · mars 2027 » ; un film sorti ensuite affiche
  « Complet en 2027 · 1 nouveau film depuis » sans effacer la date. Les cycles achevés restent,
  avec leurs dates, dans « Cycles achevés ».

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
  page : Découvrir, Ajouter mon premier exemplaire, Créer ma première liste).
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
