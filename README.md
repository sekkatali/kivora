# KIVORA : site, préinscription et espaces (Next.js + Supabase)

Contenu du dossier :

- `app/` : le site Next.js 15.
- `supabase/schema.sql` : le schéma de la base. **Il est déjà appliqué** sur ton projet Supabase « KIVORA ».

## Mode lancement (actif)

Pendant la préinscription :
- l'accueil `/` est la page de préinscription créateurs (`/inscription` affiche la même page) ;
- la vitrine marques (`/vitrine`), la demande d'accès marques (`/marques`) et l'espace marque (`/marque`) sont réservés aux admins ; les autres visiteurs sont renvoyés vers l'accueil ;
- les créateurs inscrits gardent leur espace `/createur` (profil, tarifs, parrainage), et `/connexion` reste ouvert.

Pour ouvrir le site aux marques : ajoute `NEXT_PUBLIC_LAUNCH_MODE=off` dans Vercel, puis redéploie.

## Ce qu'il y a dedans

| Page | Pour qui | Rôle |
|---|---|---|
| `/` | marques | Vitrine (héros KIVORA, 4 étapes, FAQ). Aucun faux client ni faux chiffre. |
| `/inscription` | créateurs | **Page de préinscription pour les pubs.** Formulaire en 4 étapes, capture des UTM et du parrainage, événement Meta `CompleteRegistration`. |
| `/marques` | marques | Demande d'accès anticipé (liste d'attente), événement Meta `Lead`. |
| `/connexion` | tous | Connexion et mot de passe oublié. Chacun est redirigé vers son espace. |
| `/createur` | créateur | Statut de vérification, grille de tarifs (ajouter, masquer, retirer), profil, complétude, lien de parrainage. |
| `/marque` | marque | En liste d'attente : statut et infos. Accès ouvert : catalogue filtrable. Le bouton « Réserver » ouvre WhatsApp vers l'équipe (mode conciergerie). |
| `/admin` | admin | Compteurs, **jauges du palier 1** (100 vérifiés, 4 niches, 3 villes, 30 % auto-entrepreneurs, coût par préinscrit), inscriptions par jour, sources. Vérifier ou refuser un créateur avec un message, ouvrir l'accès d'une marque, export CSV. |

### Les 3 rôles, sécurisés dans la base

Les règles sont appliquées par Supabase (RLS), pas seulement par le site :

- **Créateur** : il ne voit et ne modifie que sa fiche et ses tarifs. Il ne peut pas se valider lui-même ni changer de rôle.
- **Marque** : elle ne voit que sa fiche. Elle ne voit le catalogue qu'une fois activée par l'admin. Le catalogue n'expose jamais le téléphone ni l'e-mail d'un créateur, et seulement l'initiale de son nom.
- **Admin** : il voit tout, valide les créateurs et active les marques. Ce rôle ne peut jamais être choisi à l'inscription.

Ces règles ont été testées sur ta base réelle (test annulé ensuite, la base est vide).

---

## Mise en ligne (20 minutes)

### 1. Supabase : réglages d'authentification (obligatoire)

Dans Supabase › **Authentication** :

**a. URL Configuration**
- Site URL : `https://ton-domaine.ma`.
- Redirect URLs : ajoute `https://ton-domaine.ma/**` et `http://localhost:3000/**`.

**b. E-mails : le point qui bloque tout le monde.**
L'envoi d'e-mails par défaut de Supabase n'écrit qu'aux membres de ton équipe Supabase, avec quelques envois par heure. Avec le réglage par défaut, tes créateurs ne recevraient jamais le lien de confirmation.

1. **Recommandé pour lancer les pubs :** Sign In / Providers › Email › désactive **Confirm email**. L'inscription devient instantanée et le créateur arrive directement dans son espace. C'est le meilleur taux de conversion.
2. **Ensuite :** branche un vrai serveur d'envoi (Resend, Brevo…) dans Authentication › Emails › SMTP Settings. Sinon, « mot de passe oublié » ne fonctionnera pas pour tes utilisateurs. Resend propose une offre gratuite qui suffit au départ.
3. Si tu réactives la confirmation, modifie les modèles d'e-mail (Authentication › Emails › Templates) pour que le lien marche même s'il est ouvert sur un autre téléphone :
   - Confirm signup : `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - Reset password : `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

### 2. Déployer sur Vercel

1. Mets le dossier `app/` sur GitHub (dépôt privé), puis Vercel › Add New › Project › importe le dépôt.
2. Root Directory : `app`.
3. Ajoute les variables d'environnement suivantes (copie de `app/.env.example`) :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rnfwnawyghtdagwktbyk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_d8YEYxV4pKVpsuKGpQ4t6g_LXah17P6` (clé publique, sans risque) |
| `NEXT_PUBLIC_SITE_URL` | `https://ton-domaine.ma` |
| `NEXT_PUBLIC_WHATSAPP` | ton numéro au format `2126XXXXXXXX` (bouton démo et réservations) |
| `NEXT_PUBLIC_META_PIXEL_ID` | l'ID de ton pixel |
| `META_CAPI_TOKEN` | jeton de l'API Conversions (Events Manager › Paramètres). Variable **serveur** : ne jamais la préfixer `NEXT_PUBLIC_`. |

4. Deploy, puis branche ton domaine dans Vercel › Domains.

> Ne mets **jamais** la clé `service_role` ni le mot de passe de la base dans Vercel ou dans le code : le site n'en a pas besoin.

### 3. Créer ton compte admin

1. Inscris-toi sur le site, par exemple via `/marques`.
2. Dans Supabase › SQL Editor, exécute :
   ```sql
   update public.profiles set role = 'admin' where email = 'ton.adresse@exemple.com';
   ```
3. Reconnecte-toi : tu arrives sur `/admin`. Fais pareil pour ton frère.

### 4. À compléter avant d'envoyer du trafic

- `/confidentialite` : remplace les `[crochets]` (raison sociale, adresse, RC, e-mail).
- Déclare le traitement à la **CNDP** (loi 09-08), puis ajoute le numéro de déclaration sur la page.

---

## Pubs Meta : réglages conseillés

- **URL de l'annonce** : `https://ton-domaine.ma/inscription?utm_source=meta&utm_medium=paid&utm_campaign=p1_createurs&utm_content={{ad.name}}`
- **Événement d'optimisation** : `CompleteRegistration`, envoyé par le pixel et par l'API Conversions avec le même `eventID`, donc sans doublon.
- Les UTM sont gardés 30 jours dans le navigateur et enregistrés avec la fiche. Dans `/admin`, saisis ta dépense cumulée : le coût par préinscrit Meta se calcule tout seul (objectif < 20 DH).
- **Parrainage** : chaque créateur a un lien `…/?ref=CODE`. Le nombre de filleuls s'affiche dans son espace et dans l'export CSV.

## Développer en local

```bash
cd app
npm install
npm run dev     # http://localhost:3000
```

## Ce qui viendra au palier 2

Paiement en ligne (CMI / carte marocaine), réservation et suivi de commande dans l'app, messagerie, factures. Le schéma est prêt à recevoir ces tables. En attendant, le catalogue marque fonctionne en conciergerie via WhatsApp, comme prévu dans le plan de lancement.
