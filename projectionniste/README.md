# Filmable

Journal de cinéma, critiques, listes et collection, avec import Letterboxd. Next.js 15, rendu serveur des fiches, clé TMDB cachée côté serveur,
Supabase pour les comptes et les données. Direction artistique : voir `design/`.

## Rubriques

| URL | Contenu |
|---|---|
| `/decouvrir` | Accueil : « Aujourd'hui » (une proposition avec sa raison, trois par jour), reprise de ton parcours, populaires du moment (classement du jour TMDB), « Ce soir ? » (une phrase libre comme « dans le style de Scorsese, mafia, après 2010 », des envies, des exemples) ; guide « Marque ce que tu connais » pour un compte neuf ; `/decouvrir/populaires` : classements TMDB |
| `/parcours` | Tes parcours (cinéaste, mouvement, palmarès, saga, saison : ce que tu as vu et possédé, le prochain film, le disque à chercher), trois chemins, le catalogue ; `/ensembles/[clé]` : un parcours, lisible sans compte |
| `/listes` | Tes listes (importées de Letterboxd ou créées ici) |
| `/listes/[id]` | Une liste : affiches ou détails, classement, réorganisation (glisser-déposer, flèches, n° de place), commentaires par film ; lisible sans compte si elle est publique |
| `/collection` | Ta cinémathèque physique : dernières entrées de face, étagère continue (un dos par exemplaire coloré à mi-hauteur s'il est possédé, en entier s'il est aussi vu), ajout de plusieurs disques, une seule recherche (titre, cinéaste, 4K, scellé, prêté, pas vu…), feuille de chaque film avec ses exemplaires, « Tu cherches » ; `/collection/registre` pour les chiffres |
| `/c/[code]` | Cinémathèque partagée, lisible sans compte (jamais tes films vus ni tes prêts) |
| `/journal` | Journal daté ; onglets « Journal », « Films vus » et « À voir » (la watchlist, dans l'ordre d'ajout) |
| `/film/[id]` | Fiche (lisible sans compte) : ta note et la note TMDB, trois gestes (vu, watchlist, disque), les étoiles, un menu Plus (journal daté, coup de cœur, liste, partage), synopsis, « Où aller ensuite », casting et réalisation en photos, générique, studios |
| `/personne/[id]` | Biographie et filmographie (lisible sans compte) |
| `/studio/[id]` | Studio : logo et films, triés par popularité, date ou note |
| `/recherche?q=` | Films et personnes (suggestions instantanées dans la barre, raccourci `/`) |
| `/parametres` | Nom affiché, import Letterboxd, apparence, présentation, compte, **Mes données** (exporter en JSON et CSV, supprimer le compte) |
| `/mentions-legales`, `/confidentialite`, `/conditions` | Pages légales, lisibles sans compte |
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
3. SQL Editor : exécuter, dans l'ordre, chaque fichier de `supabase/migrations/` (les plus récents :
   `20260930100000_watchlist_order`, `20260930110000_collection_editions`, `20260930120000_film_sets`, `20261001100000_retire_social`, `20261001120000_profile_self_insert`, `20261002100000_account_deletion`).

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

## Avant de publier

La liste complète des étapes (nom de domaine, informations légales, Supabase de production, Vercel, contrôles) est dans [`LANCEMENT.md`](LANCEMENT.md). `node scripts/domaines.mjs` vérifie des noms en .com ; le nom et les informations légales sont dans `lib/brand.ts`.

## Déployer (Vercel)

1. Importer le dépôt, **Root Directory** : `projectionniste`.
2. Variables d'environnement : `TMDB_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Déployer.

## Import Letterboxd

Réglages → déposer l'archive `.zip` de l'export (letterboxd.com → Settings → Data). Sont repris :
films vus, notes, watchlist, likes (→ favoris), journal (dates, revisionnages, étiquettes),
critiques, listes (ordre et notes), films favoris du profil (→ top), nom. Les goûts (réalisateurs,
acteurs, genres) sont réappris à partir des notes. Un nouvel import met à jour sans doublons.

## Découvrir sans note prédite

Filmable ne prédit pas de note. Découvrir propose peu de films, chacun avec une raison qu'on peut
vérifier : la suite d'un cycle, le cinéaste de ton dernier film, un film possédé jamais vu, un
film qui attend dans ta watchlist, un anniversaire de sortie, ou un coup de cœur écrit à la main
(`lib/picks.ts`). Les chemins mènent à des ensembles (un cinéaste, une sélection proche des années
que tu regardes, un écart vers ce que tu ne regardes jamais). Les tirages sont fixés pour la
journée (`lib/discover.ts`, mis en cache dans le navigateur) et recalculés dès qu'un film est vu.
Le profil montre des « highlights » (réalisateur, acteur, genre, époque les plus vus, film le
mieux noté), calculés en comptant les films vus.

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
lib/            client/serveur TMDB, Découvrir (discover, picks), ensembles, highlights, import Letterboxd
supabase/       migrations SQL
```

Données et images : TMDB. Ce produit utilise l'API TMDB sans être approuvé ni certifié par TMDB.
