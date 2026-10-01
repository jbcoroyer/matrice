# Applis mobiles (Android et iOS)

Fillmography existe en **une seule base de code** : le site Next.js. Les applis Android et iOS sont une coque
[Capacitor](https://capacitorjs.com) qui affiche ce site dans une vue native, avec l'icône, l'écran de démarrage et la barre
d'état de l'appli. Les dossiers `android/` et `ios/` sont les projets natifs ; on n'y touche presque jamais.

Tant que le site n'est pas en ligne, l'appli affiche **le site qui tourne sur ton PC** (`npm run dev`), sur le même Wi-Fi.
Tout changement du site apparaît donc aussitôt sur le téléphone, sans reconstruire l'appli.

## 0. Le plus simple : installer le site comme une appli (Android et iPhone)

Aucun outil à installer. Le PC et le téléphone sont sur le même Wi-Fi.

```powershell
ipconfig
```
Repère l'« Adresse IPv4 » du Wi-Fi (par exemple `192.168.1.23`). Puis :

```powershell
cd C:\Users\jbc\matrice\projectionniste
npm run dev
```
Au premier lancement, Windows demande d'autoriser Node.js sur les réseaux **privés** : accepte.
Sur le téléphone, ouvre `http://192.168.1.23:3000` (ton adresse), crée ou ouvre ton compte, puis :
- **Android (Chrome)** : menu ⋮ → « Installer l'application » ;
- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

L'icône apparaît, et l'appli s'ouvre plein écran, sans barre d'adresse. C'est ce que verront aussi les testeurs de la bêta.

### Android en HTTPS (installation complète)

Sur Android, Chrome ne propose « Installer l'application » (plein écran) que pour une adresse en `https`. En `http` il crée
seulement un raccourci. Pour un essai complet, ouvre un tunnel HTTPS temporaire vers ton PC (gratuit, sans compte) :

```powershell
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3000
```
Il affiche une adresse `https://….trycloudflare.com` : ouvre-la sur le téléphone. Elle change à chaque lancement
(réinstalle l'appli si besoin). `npm run dev` doit tourner dans l'autre terminal.

## 1. Android : l'appli native (Android Studio)

À installer une fois : **Android Studio** (developer.android.com/studio). Au premier lancement, laisse-le télécharger le SDK.
Ensuite, Tools → Device Manager → crée un téléphone virtuel (Pixel, Android récent), ou branche un vrai téléphone (Options
développeur → Débogage USB).

Deux terminaux PowerShell dans `C:\Users\jbc\matrice\projectionniste` :

Terminal 1, le site :
```powershell
npm run dev
```

Terminal 2, l'appli (remplace par ton adresse IPv4 ; pour l'émulateur, utilise `10.0.2.2`) :
```powershell
$env:CAP_SERVER_URL = "http://192.168.1.23:3000"
npm install
npx cap sync android
npm run mobile:android
```
`mobile:android` te propose l'émulateur ou le téléphone branché, installe l'appli et la lance.
Pour ouvrir le projet dans Android Studio à la place : `npm run mobile:android:studio`.

À refaire seulement si tu changes l'adresse IP (`cap sync`), l'icône ou la config. Le code du site, lui, se recharge tout seul.

## 2. iPhone / iPad : l'appli native

Une appli iOS ne se compile **que sur un Mac** (Xcode). Depuis Windows, trois voies :
1. **Rester sur l'installation Safari du §0** : c'est l'essentiel de l'expérience, gratuit, suffisant pour la bêta.
2. Un Mac prêté ou loué à l'heure (MacinCloud, etc.) : `npm install`, `npx cap sync ios`, `npm run mobile:ios` (ouvre Xcode).
3. Un service de build dans le cloud (Codemagic, Xcode Cloud) qui compile le projet `ios/` du dépôt : à prévoir au moment de publier.

Pour distribuer à des testeurs (TestFlight) puis publier : compte **Apple Developer, 99 $/an**. Google Play : 25 $ une fois.

## Ce qui est fait

- Icône, écran de démarrage, couleur de la barre d'état, orientation portrait (le pictogramme vient de `assets/pictogramme.svg` ; pour le changer, remplace les PNG de `assets/` (`icon-only`, `icon-foreground`, `icon-background` en 1024 px, `splash` en 2732 px) puis `npm run mobile:assets`, et mets à jour `public/icons/`).
- Encoche et barre d'état gérées (marge haute `--safe-top`), barre d'onglets au-dessus de la zone du geste.
- Page de secours en français quand le site est injoignable (`mobile/www/index.html`).

## Limites connues, à traiter avant la publication

- **Liens des emails** (confirmation, mot de passe oublié) : ils s'ouvrent dans le navigateur du téléphone, pas dans l'appli.
  Il faudra des liens profonds (`https://ton-domaine/…` ouvert par l'appli). Pour la bêta : compte créé sans confirmation, ou lien ouvert dans le navigateur (on reste connecté sur le site).
- **Pas de mode hors-ligne** ni de notifications.
- **Règle 4.2 d'Apple** : une appli qui n'est qu'un site peut être refusée. Il faut de la valeur native : appareil photo pour la collection, scan du code-barres des disques, vibrations, partage, rappels de séances.
- L'**identifiant** `com.fillmography.app` (dans `capacitor.config.ts`) est définitif une fois l'appli publiée : à valider avec le nom de domaine.
