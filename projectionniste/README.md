# Le Projectionniste

Revue de cinéma personnelle, composée à partir de ses notes Letterboxd et des données TMDB.
Version « vrai site » du prototype HTML : Next.js 15, rendu serveur des fiches, clé TMDB
cachée côté serveur, URLs partageables.

## Rubriques

| URL | Contenu |
|---|---|
| `/` | Accueil : ta sélection, les films en salles, ta watchlist, les humeurs |
| `/pour-toi` | Recommandations tirées de tes films les mieux notés ; filtres genre, époque, durée, plateformes, tri |
| `/humeurs`, `/humeurs/[slug]` | 12 humeurs (noir coréen, animation japonaise, pépites méconnues…) interrogées en direct, pagination |
| `/salles` | À l'affiche en France (classé par ton indice) et prochaines sorties |
| `/watchlist` | Ta watchlist Letterboxd + ajouts faits dans le site, filtres et tris |
| `/film/[id]` | Fiche : indice personnel et « ce qui joue », où le voir (tes plateformes en évidence), bande-annonce, distribution, films proches |
| `/personne/[id]` | Biographie et filmographie classée par ton indice (« tu en as vu 7 sur 12 ») |
| `/portrait` | Tes statistiques : distribution des notes, affinités réalisateurs / interprètes / genres, panthéon |
| `/recherche?q=` | Films et personnes ; la barre du haut propose des suggestions instantanées (raccourci `/`) |
| `/reglages` | Plateformes, import Letterboxd (.zip), films écartés |

Dans le site, on peut ajouter / retirer un film de la watchlist (bouton + sur chaque affiche), le mettre en favori,
le marquer vu et le noter (demi-étoiles), ou l'écarter (« Pas pour moi »). Chaque action peut
être annulée depuis la notification.

## Démarrer

```bash
cd projectionniste
cp .env.example .env.local   # TMDB_TOKEN + NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev                  # http://localhost:3000
```

Le jeton TMDB (« jeton d'accès en lecture », commence par `eyJ`) se trouve sur
<https://www.themoviedb.org/settings/api>. Il n'est jamais envoyé au navigateur : toutes les
requêtes passent par `/api/tmdb/…`, qui n'accepte qu'une liste blanche de chemins et met les
réponses en cache.

## Base de données (Supabase)

1. Projet Supabase → **Connect** → Next.js : copier l'URL et la clé *publishable* dans `.env.local`.
2. Authentication → Sign In / Providers : activer **Allow anonymous sign-ins**.
3. SQL Editor : exécuter, dans l'ordre, chaque fichier de `supabase/migrations/`.

Chaque visiteur reçoit une session anonyme ; ses données (états des films, journal, critiques,
listes, collection, réglages, goûts appris) sont en base, protégées par RLS. Les comptes (email,
Google) viendront convertir ces sessions sans perte.

Tant que les comptes n'existent pas, la session est liée au navigateur : effacer les données du
site ou changer de navigateur (ou passer de localhost au site en ligne) repart d'un profil vide.

## Déployer (Vercel)

1. Importer le dépôt, **Root Directory** : `projectionniste`.
2. Variables d'environnement : `TMDB_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Déployer.

## Import Letterboxd

Réglages → déposer l'archive `.zip` de l'export (letterboxd.com → Settings → Data). Sont repris :
films vus, notes, watchlist, likes (→ favoris), journal (dates, revisionnages, étiquettes),
critiques, listes (ordre et notes), films favoris du profil (→ top), nom. Les goûts (réalisateurs,
acteurs, genres) sont réappris à partir des notes. Un nouvel import met à jour sans doublons.

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
supabase/       migrations SQL
```

Données et affiches : TMDB. Plateformes : JustWatch via TMDB. Ce produit utilise l'API TMDB
sans être approuvé ni certifié par TMDB.
