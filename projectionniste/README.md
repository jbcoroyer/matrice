# Filmable

Journal de cinéma, critiques, listes, collection et recommandations calées sur tes goûts,
avec import Letterboxd. Next.js 15, rendu serveur des fiches, clé TMDB cachée côté serveur,
Supabase pour les comptes et les données. Direction artistique : voir `design/`.

## Rubriques

| URL | Contenu |
|---|---|
| `/decouvrir` | Accueil : ton film de la semaine (carrousel), rangées Pour toi et Tendances ; « Tout voir » mène aux listes complètes (filtres, humeurs) |
| `/watchlist` | Ta watchlist, filtres et tris |
| `/listes` | Tes listes (importées de Letterboxd ou créées ici) |
| `/listes/[id]` | Une liste : affiches ou détails, classement, réorganisation (glisser-déposer, flèches, n° de place), commentaires par film ; lisible sans compte si elle est publique |
| `/critique/[id]` | Une critique publique : j'aime et commentaires ; lisible sans compte |
| `/bilan` | Bilan de l'année : visionnages par mois, notes, meilleurs films, genres, époques, cinéastes, acteurs, moments |
| `/collection` | Ta cinémathèque physique : cartes de collection (format, édition, éditeur, n° d'édition, scellé, état, prêt, photo), vues Vitrine / Étagère / Classeur (séries à compléter), envies, filtres « jamais vus », scellés, éditions limitées ; import CSV, partage public |
| `/c/[code]` | Cinémathèque partagée, lisible sans compte (jamais tes films vus ni tes prêts) |
| `/journal` | Journal daté ; onglet « Films vus » avec tous les films marqués comme vus |
| `/film/[id]` | Fiche : indice, note TMDB et moyenne des membres, actions (journal, vu, watchlist, note, coup de cœur, liste, collection, top 5), synopsis, « Qui l'a vu », casting et réalisation en photos, générique, studios, critiques, films proches |
| `/personne/[id]` | Biographie et filmographie classée par ton indice |
| `/studio/[id]` | Studio : logo et films, triés par popularité, date ou note |
| `/recherche?q=` | Films et personnes (suggestions instantanées dans la barre, raccourci `/`) |
| Menu profil (icône en haut à droite) | Mon profil (`/portrait`), Journal (`/journal`), Paramètres (`/parametres`), déconnexion |

Dans le site, on peut ajouter / retirer un film de la watchlist (bouton + sur chaque affiche), le mettre en favori,
le marquer vu et le noter (demi-étoiles), ou l'écarter (« Pas pour moi »). Chaque action peut
être annulée depuis la notification.

## Démarrer

```bash
cd projectionniste
cp .env.example .env.local   # TMDB_TOKEN + NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev                  # http://localhost:3000 (port fixe)
```

Le jeton TMDB (« jeton d'accès en lecture », commence par `eyJ`) se trouve sur
<https://www.themoviedb.org/settings/api>. Il n'est jamais envoyé au navigateur : toutes les
requêtes passent par `/api/tmdb/…`, qui n'accepte qu'une liste blanche de chemins et met les
réponses en cache.

## Base de données (Supabase)

1. Projet Supabase → **Connect** → Next.js : copier l'URL et la clé *publishable* dans `.env.local`.
2. Authentication → Sign In / Providers : Email activé (connexion obligatoire). Les connexions
   anonymes ne servent plus qu'aux anciennes sessions : on peut les désactiver une fois tous les
   comptes créés.
3. SQL Editor : exécuter, dans l'ordre, chaque fichier de `supabase/migrations/`.

Il faut un compte (email + mot de passe) pour utiliser l'appli ; sans session, tout le site
affiche l'écran de connexion. Les données de chacun (états des films, journal, critiques, listes,
collection, réglages, goûts appris, import Letterboxd) sont rattachées à son compte et protégées
par RLS. Une ancienne session anonyme avec des données peut être transformée en compte sans perte.

Ce qui est public : le nom affiché, le pseudo, la bio et l'avatar du profil ; les critiques
publiques (une entrée du journal avec critique, sauf si « Critique privée » est cochée), leurs
« j'aime » et commentaires ; les listes publiques ; la cinémathèque si son partage est activé (jamais les films vus, les prêts
ni les dates d'achat). Les photos d'exemplaires sont stockées dans un dossier par utilisateur du
bucket `collection-photos` : seul leur propriétaire peut les ajouter ou les supprimer, et elles ne
s'affichent publiquement que si le partage des notes et photos est activé.
Les réglages et goûts appris ne sont lisibles que par leur propriétaire (fonction `my_profile`).

Dans Supabase, Authentication → URL Configuration : Site URL `http://localhost:3000` (puis l'URL
du site en ligne) et `http://localhost:3000/**` dans Redirect URLs, pour les liens de confirmation
et de réinitialisation du mot de passe.

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

Données et images : TMDB. Ce produit utilise l'API TMDB sans être approuvé ni certifié par TMDB.
