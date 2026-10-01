# Composants signature

## Navigation (`components/Masthead.tsx`, `components/QuickLog.tsx`)

- Ordinateur : **Découvrir · Parcours · Journal · Collection**, puis recherche, bouton crème
  **Journaliser** et avatar. Le menu de l'avatar contient Mes chiffres, Mes listes, Paramètres.
- Mobile : barre flottante Découvrir · Parcours · **+** · Journal · Collection. Le + est un rond
  crème un peu surélevé ; la loupe est dans l'en-tête.
- **Une seule recherche** (en-tête) : films et personnes ; pour une phrase de trois mots ou plus
  (« dans le style de Scorsese, mafia, après 2010 »), une ligne propose « Trouver un film qui
  correspond » et mène à Découvrir, qui lance la recherche.
- **Journaliser** ouvre la recherche d'un film (Entrée choisit le premier résultat), puis
  « J'ai vu… », puis une notification avec « Voir dans le journal ».

## Fiche film (`app/film/[id]/page.tsx`)

- Image du film en fond pleine largeur, fondue vers le noir ; affiche arrondie posée dessus.
- Libellés (genres · année · durée · visa), titre en deux graisses, « Un film de … · avec … »
  (liens vers les personnes).
- Barre de notes : ta note en pastille crème pleine avec étoile, note TMDB.
- **Trois gestes visibles** : *Je l'ai vu* (devient « Vu »), *Watchlist* (masqué une fois vu),
  *Disque* ; puis la note en étoiles et un menu « … » : Ajouter au journal avec la date, Coup de
  cœur, Ajouter à une liste, Partager, Je le cherche en disque.
- Synopsis.
- **Casting et réalisation** en photos, tout cliquable.
- **Générique** : rôles alignés à droite, noms à gauche, comme un générique de fin ; logos des
  **studios** (en blanc) qui mènent à `/studio/[id]`.
- **Où aller ensuite** (`FilmDoors`) : jusqu'à trois portes (même cinéaste, la saga dans l'ordre,
  une sélection dont le film fait partie), chacune avec un photogramme, où tu en es et le film par
  lequel continuer. Pas de « films proches » calculés : des liens qu'on peut expliquer.
- Sans compte : la fiche est lisible, les actions sont remplacées par « Créer un compte ».

## Découvrir (`app/decouvrir/page.tsx`, `lib/discover.ts`, `lib/ask.ts`, `components/Today.tsx`, `Tonight.tsx`, `Onboarding.tsx`)

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
- **Reprendre un parcours** (`ParcoursTeaser`) : les deux parcours suivis les plus récents, avec où
  tu en es et le prochain film ; seulement si tu en suis.
- Les **trois chemins** (un cinéaste, une sélection proche, un écart, plus « Ce mois-ci » quand une
  sélection de saison existe) sont dans **Parcours** ; les parcours déjà suivis ne sont pas reproposés.
- Les anciennes humeurs redirigent vers une sélection (« Noir coréen » → Renouveau coréen) ou vers
  Découvrir. Après un film journalisé, le message propose « Et ensuite ? ».
- Ordre de la page : Aujourd'hui · Reprendre un parcours · Populaires du moment (8 affiches) · Ce soir ?.

## Cinémathèque (`app/collection/page.tsx`, `components/CollectionCard.tsx`)

La collection **physique**, séparée de ce qu'on a vu (les films vus vivent dans le journal et le
profil). Planches de départ : `design/collection/`.

**Distinguer vu et possédé, partout dans l'appli**
- **Vu** : immatériel. Pastille œil (avec la note si elle existe) en haut à droite de l'affiche.
- **Watchlist** : pastille marque-page.
- **Possédé** : un objet. Sur les affiches (Découvrir, À voir, recherche…) : filet crème dans
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
  (Ajouter plusieurs disques, Partager, Mes parcours, Je cherche un disque). Une ligne rappelle les prêts s'il y en a. **Ajouter plusieurs disques** : un film par ligne, avec année et support facultatifs (« Heat (1995) — 4K »), Filmable retrouve chaque film, on confirme.
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

## Parcours (`app/parcours/page.tsx`, `components/Parcours.tsx`, `Catalogue.tsx`, `lib/sets.ts`, `lib/editorial.ts`, `components/SetView.tsx`)

Un **parcours** est un ensemble de films (la filmographie d'un cinéaste, une saga, un studio, un
mouvement, un palmarès, une saison) qu'on suit pour le **voir et le posséder**. Une seule notion, une
seule page ; l'ancien « rayon » (posséder) et « cycle » (voir) sont réunis.

- **Parcours** (`/parcours`, dans la navigation) : « Voir *et posséder* », puis **tes parcours**, **trois
  chemins** pour en trouver d'autres, et **le catalogue** par familles (Mouvements, Cinémas du monde,
  Saisons, Palmarès, Studios, Sagas).
- **Un parcours suivi** = une étagère : un dos par film, dont la **couleur de l'affiche monte à
  mi-hauteur** s'il est vu **ou** possédé, et remplit tout le dos s'il est vu **et** possédé (pointillé
  quand on n'a pas le disque). À droite « 12 / 38 vus · 5 possédés ». Dessous : **À voir ensuite** (le
  prochain film pas vu) et **Disque à chercher** (d'abord un film déjà vu qu'on n'a pas en disque).
  Trois parcours à l'affiche, les autres repliés ; une légende commune. Un parcours à la fois vu et
  possédé en entier garde « Parcours complet · mars 2027 ».
- **Page d'un parcours** (`/ensembles/[clé]`, lisible sans compte) : neutre, comme une fiche. Titre,
  description, **la règle en clair**, **Par où commencer** (ou « Et ensuite »), et un seul bloc « Ton
  parcours : 9 vus sur 13 · 4 possédés » avec **Suivre ce parcours** (suit à la fois à voir et à posséder)
  ou Voir dans mes parcours / Ne plus suivre. « Ajuster » permet de ne pas compter un film. Pour une
  personne : Réalisation · Rôles principaux · Toute la filmographie.
- **Catalogue** : le même pour tout le monde, sans sélection sous licence. Les sélections résolues sur
  TMDB sont gardées un mois dans le navigateur. Les sélections de saison (octobre : frissons ; décembre :
  Noël ; l'été ; mai : Palmes d'or ; février-mars : Oscars) sont mises en avant « Ce mois-ci ».
- **Après un film vu ou un disque ajouté**, un message dit où en est le parcours le plus avancé qui le
  contient et la suite (« La Nouvelle Vague : 8 vus sur 20. À voir ensuite : *Jules et Jim* »).
- Anciennes adresses : `/ensembles` → Parcours ; `collection?rayon=…` et `journal?onglet=cycles` →
  Parcours.

## Écran d'accueil (`components/AuthScreen.tsx`)

Mur d'affiches du moment incliné et assombri, grand mot-marque « **Film**able », **une promesse**
(« Vois et *possède* les films qui comptent »), une phrase qui explique les parcours colorés, trois
parcours lisibles sans compte (Palmes d'or, Nouvelle Vague, Studio Ghibli), et le formulaire dans une
carte en verre. Pas de liste de fonctions : la promesse d'abord.

## Vocabulaire

- Pas d'**indice** ni de recommandation : décision du propriétaire, pour rester ouvert à tout le cinéma.
- **Note** : celle que tu as donnée. Pastille pleine crème avec étoile, « ta note ».
- **Coup de cœur** : le cœur d'un film (fiche, journal). « J'aime » ne sert que pour les critiques.
- **Mes chiffres** (`/portrait`, menu de l'avatar) : deux vues, *Depuis toujours* (chiffres, répartition
  des notes, **highlights** : réalisateur, acteur, genre, époque les plus vus, film le mieux noté) et
  *Une année* (le bilan, mois par mois). Liens vers les films vus, les parcours et les chiffres de la
  collection (`/collection/registre`). Plus de Top 5 ni de profil public : Filmable est un carnet privé.

## Premier lancement et pages vides (`components/ui.tsx`)

- **Présentation** (`Welcome`, plein écran, à la première connexion d'un compte vide ; rouvrable depuis
  Paramètres → Présentation) : cinq écrans en cartes, avec « Passer la présentation » et la flèche
  droite/gauche. 1 *Bienvenue* : la promesse et quatre cartes (Découvrir, Parcours, Journal, Collection) ;
  2 *Un journal en deux clics* (maquette d'un journal) ; 3 *Des étagères qui se colorent* (maquette d'un
  parcours, légende vu / possédé / les deux) ; 4 *Trouve quoi voir* (maquette d'« Aujourd'hui » et de la
  phrase libre) ; 5 *Tu viens de Letterboxd ?* avec **le dépôt de l'export directement dans l'écran**
  (explications, progression, résultat), « Plus tard » ou « Commencer à zéro ». Mémorisée sur le compte
  (`profiles.settings.onboarded`) et dans le navigateur.
- **Marque ce que tu connais** (`Onboarding`, en haut de Découvrir, tant qu'on a vu moins de 5 films) :
  « Marque ce que *tu connais* » : dix-huit affiches de films très connus à cocher (enregistrés comme
  vus tout de suite). Dès deux films cochés, un **premier chemin** apparaît (« Tu as déjà vu 2 de ses
  9 films »). Import Letterboxd, Voir les parcours, Masquer ce guide (mémorisé).
- **Page vide** (`EmptyState`) : un titre, une phrase qui dit à quoi sert la page, et de quoi la
  remplir (`StartActions` : Journaliser un film, Importer mon Letterboxd ; ou l'action propre à la
  page : Découvrir, Ajouter mon premier exemplaire, Créer ma première liste).
  Utilisé par le Journal, À voir, la Collection, Mes chiffres et les Listes.

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
