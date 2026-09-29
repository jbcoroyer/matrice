# Système de design

Tous les jetons vivent dans `app/globals.css` (`:root` = sombre, `[data-theme="light"]` = clair).

## Couleurs

| Jeton | Sombre (défaut) | Clair |
|---|---|---|
| `--bg` | `#0c0c0e` | `#f6f4ef` |
| `--bg-2` / `--bg-3` / `--bg-4` | `#141417` / `#1c1c20` / `#27272c` | `#ffffff` / `#efece5` / `#e2ded5` |
| `--text` | `#f3efe6` | `#17150f` |
| `--text-2` / `--text-3` | ivoire à 66 % / 45 % | encre à 68 % / 50 % |
| `--line` / `--line-2` | blanc à 8 % / 16 % | encre à 9 % / 18 % |
| `--cream` (accent) | `#ede4cc` | `#1c1a14` (l'accent devient l'encre) |
| `--good` / `--low` | affinités positives / négatives, cœur | idem, plus sombres |

## Typographie

Urbanist (variable, auto-hébergée via `@fontsource-variable/urbanist`).

| Usage | Réglage |
|---|---|
| Titre de fiche | 44–92 px, 700, tracking −0.04em ; partie secondaire en 250 |
| Titres de page | 34–52 px, 700 ; second mot en 250 |
| Titres de section | 22–26 px, 700 + 250 |
| Libellés | 11 px, 600, capitales, +0.18em, `--text-3` |
| Grands chiffres | 36–46 px, 250, tracking −0.045em |
| Texte | 15 px (interface), 17–18.5 px (synopsis, critiques) |

## Formes

Rayons : `--r-xl` 28 (carrousel, fenêtres), `--r-lg` 22 (blocs, affiche de fiche), `--r-md` 16
(affiches), `--r-sm` 12 (champs), `--r-xs` 8. Boutons, puces, onglets : pilule. Ombre unique
`--shadow` pour ce qui flotte (menus, affiches mises en avant).

## Composants de base

- `.btn` (contour fin) · `.btn.primary` (crème) · `.btn.icon` (rond) · `.btn[aria-pressed]`
- `.pill` (note crème) · `.chip` (puce contour) · `.seg` (bascule en pilule)
- `.label` (libellé capitales) · `.block-title` / `duo()` (titre deux graisses)

## Mouvement

120–250 ms pour les survols, 600 ms pour le carrousel ; courbe `--ease` sans rebond ;
`prefers-reduced-motion` coupe tout.
