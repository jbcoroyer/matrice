# Emails d'authentification (Supabase)

Trois modèles en français, aux couleurs de l'appli (fond sombre, bouton crème). Ils se collent dans
**Supabase → Authentication → Emails → Templates**. L'objet de chaque email se règle dans le même écran.

| Modèle Supabase | Fichier | Objet à saisir |
|---|---|---|
| Confirm sign up | `confirmation.html` | Confirme ton adresse email — Fillmography |
| Reset password | `recovery.html` | Ton nouveau mot de passe — Fillmography |
| Change email address | `email_change.html` | Confirme ta nouvelle adresse — Fillmography |

Les autres modèles (Invite user, Magic link, Reauthentication) ne servent pas : l'appli n'utilise que email + mot de passe.
Les variables `{{ .ConfirmationURL }}`, `{{ .Email }}` et `{{ .NewEmail }}` sont remplies par Supabase : ne pas les modifier.

## Pourquoi un service d'envoi à part

L'envoi intégré de Supabase ne livre qu'aux adresses des membres de ton organisation Supabase, et est très limité en nombre.
Tes testeurs ne recevraient donc pas leur lien. Il faut brancher un service SMTP (**Authentication → Emails → SMTP Settings**).

### Option recommandée : Resend (offre gratuite : 3 000 emails/mois, 100/jour)

1. Créer un compte sur resend.com, ajouter le **domaine** (Domains → Add Domain), choisir la région **EU (Ireland)**.
2. Ajouter chez le registrar les enregistrements DNS que Resend affiche (SPF, DKIM), plus un enregistrement **DMARC** :
   `_dmarc` · TXT · `v=DMARC1; p=none; rua=mailto:ton-email`. Attendre « Verified ».
3. API Keys → créer une clé (permission « Sending access »). **Ne la colle ni dans le dépôt ni dans un message** : seulement dans Supabase.
4. Dans Supabase, SMTP Settings → *Enable custom SMTP* :
   - Sender email : `bonjour@ton-domaine.com` (ou `noreply@…`) ; Sender name : `Fillmography`
   - Host : `smtp.resend.com` · Port : `465` · Username : `resend` · Password : la clé API
5. Authentication → Rate Limits : régler « Emails sent per hour » à une valeur raisonnable (30 suffit pour une bêta).
6. Tester : créer un compte avec une adresse perso, vérifier l'arrivée (hors spams), puis « Mot de passe oublié ».

Brevo (offre gratuite : 300 emails/jour) fonctionne aussi, mais exige lui aussi un domaine pour une bonne délivrabilité.
Envoyer depuis une adresse Gmail n'est pas recommandé : les emails finissent en spam.

### URL Configuration (obligatoire, sinon les liens des emails sont refusés)

Authentication → URL Configuration :
- **Site URL** : `https://ton-domaine.com`
- **Redirect URLs** : `https://ton-domaine.com/**` (et, pour les essais locaux, `http://localhost:3000/**`)

## En attendant le domaine (bêta de quelques personnes)

Tant qu'il n'y a pas de domaine, deux solutions provisoires :
- **Désactiver « Confirm email »** (Authentication → Sign In / Providers → Email) : l'inscription fonctionne sans email.
  Défaut : n'importe quelle adresse (même fausse) peut créer un compte, et « Mot de passe oublié » n'enverra rien.
  Acceptable pour 5 à 10 proches ; à réactiver avant toute ouverture publique.
- Ou créer les comptes toi-même (Authentication → Users → Add user → *Auto Confirm User*) et donner les identifiants.
