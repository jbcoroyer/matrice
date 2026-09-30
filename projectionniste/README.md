# Filmable

Journal de cinéma, critiques, listes et collection, avec import Letterboxd. Next.js 15, rendu serveur des fiches, clé TMDB cachée côté serveur,
Supabase pour les comptes et les données. Direction artistique : voir `design/`.

## Rubriques

| URL | Contenu |
|---|---|
| `/decouvrir` | Accueil : les films à la une cette semaine (carrousel), humeurs, rangées À l'affiche, Tendances, Bientôt en salles, Les mieux notés ; aucun tri personnalisé |
| `/watchlist` | Ta watchlist, dans l'ordre d'ajout (le plus récent d'abord), filtres et tris |
| `/listes` | Tes listes (importées de Letterboxd ou créées ici) |
| `/listes/[id]` | Une liste : affiches ou détails, classement, réorganisation (glisser-déposer, flèches, n° de place), commentaires par film ; lisible sans compte si elle est publique |
| `/critique/[id]` | Une critique publique : j'aime et commentaires ; lisible sans compte |
| `/bilan` | Bilan de l'année : visionnages par mois, notes, meilleurs films, genres, époques, cinéastes, acteurs, moments |
| `/collection` | Ta cinémathèque physique : dernières entrées de face, étagère continue (un dos par exemplaire, intercalaires, index), une seule recherche (titre, cinéaste, 4K, scellé, prêté, pas vu…), feuille de chaque film avec ses exemplaires, « Tu cherches » ; `/collection/registre` pour les chiffres |
| `/c/[code]` | Cinémathèque partagée, lisible sans compte (jamais tes films vus ni tes prêts) |
| `/journal` | Journal daté ; onglet « Films vus » avec tous les films marqués comme vus |
| `/film/[id]` | Fiche (lisible sans compte) : ta note, note TMDB et moyenne des membres, actions (journal, vu, watchlist, note, coup de cœur, liste, collection, top 5), synopsis, « Qui l'a vu », casting et réalisation en photos, générique, studios, critiques |
| `/personne/[id]` | Biographie et filmographie (lisible sans compte) |
| `/u/[pseudo]` | Profil public : nom, présentation, top 5, listes publiques, critiques publiques |
| `/studio/[id]` | Studio : logo et films, triés par popularité, date ou note |
| `/recherche?q=` | Films et personnes (suggestions instantanées dans la barre, raccourci `/`) |
| Menu profil (icône en haut à droite) | Mon profil (`/portrait`), Journal, Bilan, Paramètres (`/parametres`), déconnexion ; sur mobile aussi Mes listes |

Dans le site, on peut ajouter / retirer un film de la watchlist (bouton + sur chaque affiche), le mettre en favori,
le marquer vu et le noter (demi-étoiles). Le bouton **Journaliser** de l'en-tête (le + central de la barre d'onglets sur mobile) enregistre un visionnage depuis n'importe quelle page : recherche du film, puis date, note, critique. Chaque action peut
être annulée depuis la notification.

Un compte neuf (aucun film vu, noté ni en watchlist) voit un guide de démarrage en haut de Découvrir et des pages vides qui proposent quoi faire.

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

## Pas de recommandations

Filmable ne prédit pas de note et ne trie pas les films selon tes goûts : Découvrir montre les
mêmes classements à tout le monde (à l'affiche, tendances, sorties, mieux notés, humeurs), pour
rester ouvert à tout type de cinéma. Le profil montre des « highlights » (réalisateur, acteur,
genre, époque les plus vus, film le mieux noté), calculés en comptant les films vus.

## Requêtes TMDB

`lib/tmdb.ts` : au plus 6 requêtes en même temps, jusqu'à 3 essais (réseau, 429, 5xx) avec pause
croissante, annulation des requêtes en attente quand la page change, réponses gardées en mémoire.
La watchlist vient de la base en une requête (ordre d'ajout : colonne `watchlisted_at`) et
s'affiche tout de suite ; les durées ne sont demandées à TMDB, 4 à la fois, que pour le tri
« plus courts d'abord ».

## Structure

```
app/            routes (pages serveur pour film/personne, client pour les rubriques personnelles)
app/api/tmdb/   proxy TMDB (liste blanche + cache)
components/     cartes, grilles, en-tête, recherche, fiche, filmographie…
lib/            client/serveur TMDB, humeurs, highlights, import Letterboxd
supabase/       migrations SQL
```

Données et images : TMDB. Ce produit utilise l'API TMDB sans être approuvé ni certifié par TMDB.
