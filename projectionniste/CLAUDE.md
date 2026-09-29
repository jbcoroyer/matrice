# Le Projectionniste — consignes pour Claude

App Next.js 15 (App Router) + Supabase + proxy TMDB. Interface et contenus en français.

## Design : lire avant toute modification visuelle

La direction artistique est fixée dans `design/` :
- `design/ART_DIRECTION.md` — concept « Nouvelle Vague » (affiche, rouge-noir-papier), décisions validées ;
- `design/DESIGN_SYSTEM.md` — typographie (Archivo condensée + Plex Mono), couleurs, géométrie, mouvement ;
- `design/COMPONENTS.md` — composants signature (fiche « générique », bandeaux, monogramme).

Toute nouvelle page ou tout nouveau composant s'inscrit dans cette direction. Si une
décision la contredit, la documenter dans ces fichiers d'abord.

### Interdits (réflexes « UI générée »)
Pas de hero centré titre + paragraphe + bouton ; pas de cartes à coins ronds en série ;
pas de grilles « icône + titre + paragraphe » ; pas de pilules ; aucun arrondi ;
pas de dégradé décoratif, de halo, de glassmorphism, d'ombre portée floue ; pas de mise en
page symétrique par défaut ; pas d'animation sans raison liée au contenu ; pas de palette
multicolore (trio fixe : papier, noir, rouge).

### À faire à la place
Composition d'affiche ; titres de films en grotesque condensée capitale rouge, très grands ;
aplats noirs ou rouges au lieu de cartes ; bandeaux de section pleine largeur ; affiches
grandes et serrées ; métadonnées en mono ; asymétrie voulue (affiche collée au bord) ;
états de survol et de focus dessinés ; animations discrètes ; mobile composé pour lui-même.

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
