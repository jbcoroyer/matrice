# Le Projectionniste

Revue de cinéma personnelle, composée à partir de ses notes Letterboxd et des données TMDB.
Version « vrai site » du prototype HTML : Next.js 15, rendu serveur des fiches, clé TMDB
cachée côté serveur, URLs partageables.

## Rubriques

| URL | Contenu |
|---|---|
| `/` | À la une : carrousel des meilleures pistes du jour, sélection, salles, humeurs, watchlist |
| `/pour-toi` | Recommandations tirées de tes films les mieux notés ; filtres genre, époque, durée, plateformes, tri |
| `/humeurs`, `/humeurs/[slug]` | 12 humeurs (noir coréen, animation japonaise, pépites méconnues…) interrogées en direct, pagination |
| `/salles` | À l'affiche en France (classé par ton indice) et prochaines sorties |
| `/watchlist` | Ta watchlist Letterboxd + ajouts faits dans le site, filtres et tris |
| `/film/[id]` | Fiche : indice personnel et « ce qui joue », où le voir (tes plateformes en évidence), bande-annonce, distribution, films proches |
| `/personne/[id]` | Biographie et filmographie classée par ton indice (« tu en as vu 7 sur 12 ») |
| `/portrait` | Tes statistiques : distribution des notes, affinités réalisateurs / interprètes / genres, panthéon |
| `/recherche?q=` | Films et personnes ; la barre du haut propose des suggestions instantanées (raccourci `/`) |
| `/reglages` | Plateformes, import Letterboxd (.zip), sauvegarde / restauration, films écartés |

Dans le site, on peut ajouter / retirer un film de la watchlist (bouton ＋ sur chaque affiche),
le marquer vu et le noter (demi-étoiles), ou l'écarter (« Pas pour moi »). Chaque action peut
être annulée depuis la notification.

## Démarrer

```bash
cd projectionniste
cp .env.example .env.local   # puis colle ton jeton TMDB dans TMDB_TOKEN
npm install
npm run dev                  # http://localhost:3000
```

Le jeton TMDB (« jeton d'accès en lecture », commence par `eyJ`) se trouve sur
<https://www.themoviedb.org/settings/api>. Il n'est jamais envoyé au navigateur : toutes les
requêtes passent par `/api/tmdb/…`, qui n'accepte qu'une liste blanche de chemins et met les
réponses en cache.

## Déployer (Vercel)

1. Importer le dépôt, **Root Directory** : `projectionniste`.
2. Variable d'environnement `TMDB_TOKEN`.
3. Déployer. Rien d'autre à configurer.

## Données personnelles

- `public/seed.json` est le profil de départ (historique Letterboxd en identifiants IMDb +
  affinités calculées). Il est **public** une fois le site en ligne. Pour un autre profil,
  remplace-le, ou importe simplement ton export Letterboxd dans Réglages.
- À la première visite, le navigateur relie ces identifiants IMDb à TMDB (≈ 20 s, une fois).
  Pour supprimer cette attente : `npm run seed` (avec `TMDB_TOKEN`) écrit la correspondance
  dans `public/seed.json`.
- Tout le reste (plateformes, notes et marques, import Letterboxd) reste dans le
  `localStorage` du navigateur. Réglages → Sauvegarde permet de l'emporter ailleurs.

## Comment l'indice est calculé

`lib/predict.ts` : note prédite = ta moyenne + 0,25 × (note TMDB lissée − 7) + 1,2 × affinité
genres + 0,8 × affinité réalisateur + 0,2 × affinité interprètes, bornée à [0,5 ; 5].
Les affinités sont l'écart moyen de tes notes à ta moyenne, lissé pour ne pas surréagir à un
film isolé ; l'import Letterboxd les réapprend à partir de tes notes (`learnAffinities`).

`lib/recs.ts` : « Pour toi » agrège les recommandations TMDB de tes films notés 4,5 et plus,
pondérées par ta note et le rang, puis reclasse par indice en limitant le poids de chaque film
source (diversité). Recalculé une fois par jour ou quand ton historique change.

## Structure

```
app/            routes (pages serveur pour film/personne, client pour les rubriques personnelles)
app/api/tmdb/   proxy TMDB (liste blanche + cache)
components/     cartes, grilles, en-tête, recherche, fiche, filmographie…
lib/            client/serveur TMDB, prédiction, recommandations, humeurs, import Letterboxd
scripts/        map-seed.mjs
```

Données et affiches : TMDB. Plateformes : JustWatch via TMDB. Ce produit utilise l'API TMDB
sans être approuvé ni certifié par TMDB.
