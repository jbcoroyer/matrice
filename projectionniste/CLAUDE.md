# Filmable — consignes pour Claude

App Next.js 15 (App Router) + Supabase + proxy TMDB. Interface et contenus en français.

## Design : lire avant toute modification visuelle

La direction artistique est fixée dans `design/` :
- `design/ART_DIRECTION.md` — « salle obscure » : sombre d'abord, accent crème, le film porte la couleur ;
- `design/DESIGN_SYSTEM.md` — jetons, Urbanist, formes arrondies, mouvement ;
- `design/COMPONENTS.md` — fiche film, film de la semaine, écran d'accueil ;
- `design/references/` — références du propriétaire, avec ce qu'on en retient.

Toute nouvelle page ou tout nouveau composant s'inscrit dans cette direction. Si une
décision la contredit, la documenter dans ces fichiers d'abord.

### Interdits
Pas de look « tableau de bord SaaS » : lueurs colorées, verre dépoli décoratif, dégradés
d'interface, palette multicolore, icônes de couleur, cartes à ombre lourde en série, grilles
« icône + titre + paragraphe ». Pas de notion de disponibilité (plateformes, où le voir) ni de
bande-annonce : le propriétaire les a retirées. Pas de pictogramme à côté du nom.

### À faire à la place
La couleur vient des images du film (fond, ambiance floutée) ; interface neutre ; un seul
accent crème, rare ; hiérarchie par taille et opacité ; titres en deux graisses ; libellés
en capitales espacées ; arrondis doux et pilules fines ; beaucoup d'air ; tout ce qui nomme
une personne, un film ou un studio est cliquable ; mobile avec barre d'onglets flottante.

### Contrôle qualité visuel (obligatoire après un changement d'interface)
1. Construire, lancer, capturer (Playwright) en 1280 px, 390 px et en mode sombre.
2. Critiquer chaque capture comme un directeur artistique exigeant : qu'est-ce qui fait
   « template » ou « IA » ? trop de boîtes ? trop symétrique ? typographie assez affirmée ?
   rythme ? mobile réellement composé ? chaque effet justifié ?
3. Corriger, recapturer, jusqu'à ce que la réponse soit satisfaisante.

## Code
- Couleurs et tailles uniquement via les jetons de `app/globals.css`.
- Polices auto-hébergées (`@fontsource`), importées dans `app/layout.tsx`.
- Accessibilité : focus visibles, `aria-*` sur les contrôles, contrastes du système.
- Ne jamais commiter de secret (`.env.local` est ignoré ; la clé TMDB reste côté serveur).
