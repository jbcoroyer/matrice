# Composants signature

## Fiche film (`app/film/[id]/page.tsx`)

- Image du film en fond pleine largeur, fondue vers le noir ; affiche arrondie posée dessus.
- Libellés (genres · année · durée · visa), titre en deux graisses, « Un film de … · avec … »
  (liens vers les personnes).
- Barre de notes : pastille crème (ton indice ou ta note), TMDB, moyenne des membres, et ce qui
  fait bouger l'indice.
- Actions en pilules : Ajouter au journal, Vu, Watchlist, note en étoiles, coup de cœur, liste,
  collection, menu « … » (top 5, partager, pas pour moi).
- Synopsis + **Qui l'a vu** (membres, moyenne, notes ; chacun peut se masquer).
- **Casting et réalisation** en photos, tout cliquable.
- **Générique** : rôles alignés à droite, noms à gauche, comme un générique de fin ; logos des
  **studios** (en blanc) qui mènent à `/studio/[id]`.
- Critiques des membres, puis « Dans le même esprit ».

## Film de la semaine (`app/decouvrir/page.tsx`)

Carrousel : affiche centrale grande, voisines en retrait et inclinées ; fond d'ambiance tiré de
l'affiche active ; texte à gauche (titre deux graisses, libellés, indice, résumé, raison),
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

**Tri** : par réalisateur (nom de famille, puis date) dans toutes les vues, par défaut.

**Trois vues** : Vitrine (cartes), Étagère (une seule étagère pour tous les formats : mêmes dos noirs,
même taille, sans mention de format ; trou « prêté »), Classeur
(un réalisateur par ligne : « 3 possédés sur 34, il en manque 31 » ; un clic ouvre ce qu'on
possède et tout ce qui manque, avec un bouton « Envie »).
**Envies** : films qu'on voudrait posséder en disque.

## Écran d'accueil (`components/AuthScreen.tsx`)

Mur d'affiches du moment incliné et assombri, grand mot-marque « **Film**able », formulaire
dans une carte en verre.
