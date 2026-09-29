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

## Écran d'accueil (`components/AuthScreen.tsx`)

Mur d'affiches du moment incliné et assombri, grand mot-marque « **Film**able », formulaire
dans une carte en verre.
