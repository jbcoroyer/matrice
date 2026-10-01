# Lancement : ce qu'il reste à faire

Cases à cocher dans l'ordre. **[moi]** = fait par Claude dans le code ; **[toi]** = à faire par toi (comptes, achats, décisions).

## 0. Déjà prêt dans le code
- [x] Suppression de compte et export des données (Paramètres → Mes données ; migration `20261002100000_account_deletion.sql`)
- [x] Pages légales : `/mentions-legales`, `/confidentialite`, `/conditions` (liens dans le pied de page et à l'inscription)
- [x] Limite de débit du relais TMDB (1 200 appels/minute/IP, 6 000/minute au total par instance, refus des appels venus d'un autre site)
- [x] Nom et mot-marque centralisés dans `lib/brand.ts` (changer de nom = un seul fichier)
- [x] Dépôt trié : l'ancien outil est dans `archives/`, l'application dans `projectionniste/`

## 1. Choisir le nom et le domaine
- [x] Nom retenu : **Fillmography** (mot-marque « **Fill**mography »)
- [ ] **[toi]** Vérifier que fillmography.com est libre : `node scripts/domaines.mjs fillmography` (depuis `projectionniste/`) ; sinon, voir les autres noms
- [ ] ~~Lancer `node scripts/domaines.mjs`~~ (depuis `projectionniste/`) pour voir quels noms en .com sont libres ; coller le résultat à Claude
- [ ] **[toi]** Vérifier la marque du nom retenu sur le site de l'INPI (base des marques) et dans les stores (App Store, Google Play)
- [ ] **[toi]** Acheter le domaine .com (registrar de ton choix) et activer la protection de la vie privée (masquer tes coordonnées dans le Whois)
- [ ] **[toi]** Faire le logo en SVG ; **[moi]** l'intégrer (icônes PNG 192/512, icône iPhone, image de partage) et changer le nom dans `lib/brand.ts`

## 2. Compléter les informations légales
- [x] Identité de l'éditeur (Jean-Baptiste Coroyer, entrepreneur individuel, adresse, email), hébergeurs et région (Irlande) renseignés dans `lib/brand.ts`
  - Particulier non professionnel : tu peux ne pas publier ton adresse si tu la communiques à l'hébergeur, qui la garde en cas de demande de justice. Les mentions légales le permettent.
- [ ] **[toi]** Quand le changement d'activité (éditeur de logiciel) est enregistré, me le dire : je mets à jour le statut dans `lib/brand.ts`. Une fois le domaine choisi, je renseigne `BRAND.url`.
- [ ] **[toi]** Faire relire les trois pages par un juriste ou une personne compétente avant l'ouverture publique (ce ne sont pas des conseils juridiques)
- [ ] **[toi]** Ajouter le **logo TMDB** dans le pied de page (fichier fourni par TMDB, https://www.themoviedb.org/about/logos-attribution) : exigence de leur licence

## 3. Base de données de production (Supabase)
- [ ] **[toi]** Créer un projet Supabase de production, **région Union européenne**
- [ ] **[toi]** SQL Editor : exécuter dans l'ordre tous les fichiers de `supabase/migrations/` (le dernier : `20261002100000_account_deletion.sql`)
- [ ] **[toi]** Authentication → URL Configuration : adresse du site en ligne dans *Site URL* et dans *Redirect URLs* (`https://ton-domaine.com/**`)
- [ ] **[toi]** Authentication → SMTP : brancher un vrai service d'envoi d'emails (Resend, Brevo…) : l'envoi par défaut de Supabase est très limité
- [ ] **[toi]** Authentication → Providers → Email : garder la confirmation par email activée
- [ ] **[toi]** Ne jamais copier la clé `service_role` / secret dans le projet ni dans Vercel

## 4. Hébergement du site (Vercel)
- [ ] **[toi]** Importer le dépôt, **Root Directory = `projectionniste`**
- [ ] **[toi]** Variables : `TMDB_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (celles du projet de production)
- [ ] **[toi]** Ajouter le domaine ; **[moi]** renseigner `BRAND.url` dans `lib/brand.ts`
- [ ] **[toi]** Vérifier les conditions de l'offre gratuite de Vercel (usage non commercial) et de Supabase (mise en pause en cas d'inactivité)

## 5. Contrôles avant d'inviter des testeurs
- [ ] **[moi]** Test de sécurité : un compte ne voit jamais les données d'un autre (deux comptes de test)
- [ ] **[toi]** Créer un compte, importer ton Letterboxd, supprimer le compte, en recréer un : tout doit marcher
- [ ] **[toi]** Tester sur ton téléphone (iPhone et Android si possible)
- [ ] **[moi]** Mesure d'usage respectueuse (sans cookies) et suivi des erreurs : à décider ensemble

## 6. Bêta fermée
- [ ] **[toi]** Inviter 5 à 10 collectionneurs ; recueillir leurs retours pendant 3 à 4 semaines
