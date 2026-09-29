# Direction artistique — « Nouvelle Vague »

Décisions prises avec le propriétaire du projet (questionnaire du 29/09/2026) :

| Question | Choix |
|---|---|
| Univers | Affiche / graphisme |
| Famille d'affiches | **Nouvelle Vague** (affiches françaises des années 60) |
| Couleur | **Rouge, noir, papier** — trio fixe |
| Titres | **Grotesque condensée** en capitales |
| Dominante | **Les affiches** (images d'abord) |
| Ambiance | **Clair d'abord** ; le sombre existe, secondaire |
| Mouvement | **Discret** |
| Élément signature | **Fiche « générique »** |
| Marque | **Monogramme « P »** |
| Navigation | **Bandeau horizontal** |

## Le concept

Chaque page est composée comme une affiche de film français des années 60 : un papier
clair, un noir profond, un rouge franc, des titres en capitales serrées qui remplissent la
largeur, et l'image du film en grand. Le ton est direct, un peu brut, jamais décoratif.
Les principes viennent d'*À bout de souffle*, *Pierrot le fou*, *Les Quatre Cents Coups*,
*Le Mépris* : rien n'est copié.

Ce qui distingue immédiatement le site d'un template : les titres de films sont traités
comme des titres d'affiche (énormes, en rouge, qui débordent) ; des aplats noirs et rouges
remplacent les cartes ; le « bloc générique » (UN FILM DE… AVEC…) remplace les listes de
métadonnées ; aucune ombre, aucun arrondi, aucun dégradé.

## Principes de composition

1. **L'affiche d'abord.** Les affiches sont grandes, nettes, rectangulaires, serrées entre
   elles (gouttière 8 px). Pas de boîte autour.
2. **Le titre est une image.** Titres de films en grotesque condensée capitale, en rouge,
   à une échelle qui domine la page. Un titre peut couper une colonne, chevaucher une image
   ou une bande.
3. **Aplats, pas de cartes.** Pour isoler une information, on utilise un aplat noir ou
   rouge plein (le bandeau d'une section, l'indice, le compteur), jamais une carte à ombre.
4. **Asymétrie voulue.** L'affiche d'une fiche est collée au bord gauche de l'écran ; le
   texte occupe le reste. Les bandeaux de section vont de bord à bord.
5. **Deux densités.** Pages d'affiche (fiche, Découvrir) aérées et spectaculaires ;
   pages de registre (journal, listes, collection, paramètres) denses, en filets.

## Grille

- 12 colonnes, gouttière 24 px (8 px entre affiches), marge 32 px (16 px mobile), largeur
  utile max 1360 px.
- **Exceptions voulues** : l'affiche de la fiche sort de la marge gauche (bord à bord) ;
  le titre de la fiche peut dépasser sa colonne ; les bandeaux de section sont pleine
  largeur.

## Couleur

- Papier `#F4F1EA`, noir `#111110`, rouge `#D6231A` (contraste AA dans les deux sens).
- Rouge : titres de films, état actif (vu, favori, watchlist cochés), sélection, focus,
  un mot dans un titre de page. Noir : texte, aplats de bandeaux, indice.
- Aucune autre teinte. Les graphiques sont en noir (valeur) et rouge (mise en avant).
- Sombre (secondaire) : noir `#0F0F0E`, papier `#EEEAE1`, rouge `#F0453A`.

## Images

- Affiches 2:3, coins droits, sans ombre ; au survol : cadre rouge 4 px intérieur.
- Fonds (backdrops) en bande panoramique pleine largeur, légèrement désaturés pour que le
  rouge et le noir restent maîtres.

## Mouvement (discret)

- 120 ms pour les survols, 200 ms pour les apparitions ; courbe franche sans rebond.
- Aucune animation déclenchée sans action de l'utilisateur, sauf le fondu d'une image qui
  se charge. `prefers-reduced-motion` → tout est instantané.

## Mobile

- La fiche commence par l'affiche en pleine largeur ; le titre rouge chevauche son bas sur
  un aplat papier ; le bloc générique passe dessous ; les actions forment une barre de
  boutons carrés.
- Découvrir : bandes d'affiches défilantes plus grandes (2,3 affiches visibles), bandeaux
  de section pleine largeur.
- Navigation : monogramme + rubriques sur une ligne défilante.
