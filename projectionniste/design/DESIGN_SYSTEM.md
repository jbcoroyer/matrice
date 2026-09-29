# Système de design

Toutes les valeurs vivent dans `app/globals.css` (jetons sur `:root`).

## Typographie

Deux familles, auto-hébergées (`@fontsource`) :

| Rôle | Police | Réglages |
|---|---|---|
| Titres d'affiche | **Archivo** variable | `wdth 62`, `wght 800–900`, capitales, interlignage 0.86, tracking −0.01em |
| Interface et lecture | **Archivo** variable | `wdth 100`, `wght 400–600` |
| Libellés, boutons, bandeaux | **Archivo** variable | `wdth 75`, `wght 700`, capitales, tracking +0.04em |
| Registre technique | **IBM Plex Mono** 400/500 | capitales, 11–12 px (année, durée, compteurs) |

Échelle :

| Jeton | Taille | Usage |
|---|---|---|
| `--t-poster` | clamp(64px, 11vw, 168px) | titre de fiche film |
| `--t-display` | clamp(44px, 6vw, 88px) | titres de page |
| `--t-band` | 22–28 px | bandeaux de section (capitales condensées) |
| `--t-h3` | 17 px, wdth 75, 800 | titres d'affiches dans les grilles |
| `--t-body` | 16 px / 1.55 | résumés, critiques (mesure ≤ 64ch) |
| `--t-ui` | 14 px | interface |
| `--t-label` | 12 px, wdth 75, 700, +0.06em | boutons, libellés |
| `--t-mono` | 11.5 px | registre technique |

## Couleurs

| Jeton | Clair | Sombre |
|---|---|---|
| `--paper` | `#F4F1EA` | `#0F0F0E` |
| `--paper-2` | `#E9E5DB` | `#1B1A18` |
| `--ink` | `#111110` | `#EEEAE1` |
| `--ink-2` | `#3F3C37` | `#BDB8AE` |
| `--ink-3` | `#6B665E` | `#8F8A80` |
| `--rule` | `#111110` (filets forts) / `#CFCABF` (filets fins) | `#EEEAE1` / `#34322E` |
| `--red` | `#D6231A` | `#F0453A` |

## Géométrie

- Rayon : 0 partout (images, boutons, champs, fenêtres).
- Filets : 1 px fins, 3 px forts (ouverture de section), 8 px rouges (accent rare).
- Ombres : aucune ; la fenêtre modale a un contour noir 2 px et une ombre dure 8 px noire.

## Boutons

- Primaire : aplat noir, texte papier, capitales condensées ; survol → aplat rouge.
- Secondaire : contour noir 2 px ; survol → aplat noir.
- Bascule active (vu, favori, watchlist) : aplat rouge, texte papier.
- Focus : contour rouge 3 px décalé de 2 px.

## Espacements

Base 4 px : 4, 8, 12, 16, 24, 32, 48, 72, 112.
