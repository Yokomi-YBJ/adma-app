# ADMA — Documentation complète du projet

## 1. Résumé du projet

ADMA est une plateforme locale de mise en relation entre professionnels de services et clients, conçue pour faciliter la découverte, la vérification, la confiance et la relation commerciale dans une ville ou une région donnée, ici centrée sur les villes de Ngaoundéré et plus largement l’Adamaoua au Cameroun.

Le produit est structuré comme une application multi-couches :
- un backend API REST en Node.js / Express,
- une interface d’administration web en React + Vite,
- une application mobile en React Native / Expo,
- une base de données MySQL,
- des services tiers pour les SMS, les paiements, les emails et les notifications push.

Le projet couvre plusieurs cas d’usage :
- recherche de prestataires par catégorie, ville, quartier, disponibilité ;
- création et gestion d’une fiche prestataire ;
- vérification de prestataires via pièces d’identité ;
- avis et recommandations de clients ;
- signalements et modération ;
- notifications, abonnements premium, paiement mobile money avec KPay ;
- tableau de bord d’administration pour superviser les utilisateurs, prestataires, paiements et vérifications.

ADMA a une logique à la fois commerciale et sociale : aider à la découverte de services de proximité tout en créant de la confiance grâce à la vérification, au classement, aux avis et à la modération.

---

## 2. Vue d’ensemble non technique

### 2.1 Problème métier

Dans de nombreuses villes, les clients ont du mal à trouver des prestataires fiables, vérifiés et proches de leur lieu de résidence. Les problèmes fréquents sont :
- manque d’informations fiables,
- absence de standardisation de la qualité des services,
- difficulté à comparer les prestataires,
- faible visibilité des professionnels crédibles,
- manque de mécanismes de confiance,
- problèmes de paiement ou de gestion de souscription premium.

ADMA vise à résoudre ces problèmes en centralisant les professionnels et en donnant aux utilisateurs un outil simple pour trouver, comparer, évaluer et contacter des prestataires.

### 2.2 Cible du produit

Le produit cible principalement :
- les particuliers qui recherchent des services de proximité,
- les prestataires locaux qui souhaitent gagner en visibilité,
- les gestionnaires/admins qui supervisent les contenus, les vérifications et les paiements,
- les entreprises ou organisations qui veulent suivre les performances du marché local.

### 2.3 Valeur ajoutée pour les acteurs

Pour les utilisateurs :
- recherche rapide d’un service par catégorie ou lieu,
- accès aux fiches de prestataires complètes,
- possibilité de consulter avis et commentaires,
- possibilité d’appeler ou d’écrire directement au prestataire,
- meilleure confiance grâce à la vérification.

Pour les prestataires :
- visibilité locale,
- gestion de leur fiche professionnelle,
- mise en avant via plan premium,
- meilleure crédibilité grâce à la vérification et aux avis,
- suivi de leurs statistiques.

Pour les administrateurs :
- gestion du catalogue des catégories,
- modération des avis et signalements,
- validation des vérifications,
- suivi des paiements et plans d’abonnement,
- supervision de la croissance de la plateforme.

### 2.4 Modèle économique

Le projet inclut un modèle de monétisation basé sur des plans d’abonnement pour les prestataires, avec plusieurs niveaux :
- free,
- premium,
- professional,
- enterprise.

Les paiements sont intégrés via KPay, un service de paiement mobile money au Cameroun.

Les revenus peuvent provenir :
- des abonnements premium des prestataires,
- des commissions sur transactions ou paiements,
- la monétisation de fonctionnalités avancées,
- le développement de services supplémentaires pour les professionnels.

### 2.5 Expérience utilisateur prévue

Le parcours utilisateur de base ressemble à ceci :
1. un client ouvre l’application mobile,
2. recherche un service par catégorie ou secteur,
3. filtre les résultats par ville, quartier, disponibilité, statut de vérification,
4. consulte le profil détaillé du prestataire,
5. voit avis, réputation, nombre d’actions, photos et contacts,
6. contacte le prestataire ou enregistre le profil en favori,
7. laisse un avis ou signal un problème si nécessaire.

Le parcours prestataire ressemble à ceci :
1. création d’un compte,
2. création de sa fiche prestataire,
3. ajout de photos, description, spécialité, horaires,
4. soumission d’une demande de vérification,
5. activation d’un plan premium,
6. suivi de ses statistiques et de sa visibilité.

---

## 3. Vue d’ensemble fonctionnelle

### 3.1 Fonctionnalités principales

#### Utilisateurs clients
- inscription/authentification par OTP SMS,
- vérification du numéro de téléphone,
- gestion du profil utilisateur,
- historique des favoris,
- consultation des prestataires,
- signalement d’un prestataire ou d’un avis,
- notifications push,
- gestion des préférences de notification.

#### Prestataires
- création et édition d’une fiche professionnelle,
- upload de photos et galerie,
- gestion de la disponibilité,
- indication des moyens de contact,
- demande de vérification par CNI,
- accès à ses statistiques,
- plan d’abonnement et paiement mobile money,
- réponse à des avis.

#### Administration
- authentification sécurisée admin avec OTP par e-mail,
- tableau de bord avec statistiques de base,
- gestion des utilisateurs,
- gestion des prestataires,
- approbation/rejet des demandes de vérification,
- gestion des avis,
- gestion des signalements,
- gestion des catégories,
- suivi des paiements et abonnements,
- journaux d’actions d’administration.

### 3.2 Services externes intégrés

Le projet utilise plusieurs services tiers pour couvrir les besoins critiques :
- Twilio : envoi de codes OTP/SMS,
- Cloudinary : stockage et transformation d’images,
- KPay : paiement mobile money,
- Resend : envoi d’e-mails OTP admin,
- Expo : notifications push mobiles,
- MySQL : stockage des données transactionnelles.

---

## 4. Architecture du projet

Le dépôt est organisé en un monorepo contenant plusieurs sous-projets :

```text
Adma/
├── README.md
├── API.md
├── backend/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   └── server/
│       ├── package.json
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── jobs/
│       │   ├── middleware/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── utils/
│       │   └── server.js
│       └── .env
├── frontend/
│   ├── admin/
│   └── mobile/
├── privacy-policy/
└── ...
```

### 4.1 Backend

Le backend est un service Node.js/Express qui expose des endpoints REST sous le préfixe :

```text
/api/v1
```

Il gère :
- l’authentification,
- la logique métier de prestataires,
- la gestion des avis et signalements,
- les demandes de vérification,
- les notifications,
- le paiement des plans,
- la sécurité,
- le logging,
- les tâches planifiées.

### 4.2 Frontend Admin

L’interface d’admin est développée avec React + Vite.

Elle permet de :
- se connecter en tant qu’administrateur,
- visualiser des statistiques,
- gérer les utilisateurs,
- gérer les prestataires,
- valider ou rejeter les demandes de vérification,
- traiter les paiements et abonnements,
- gérer les catégories,
- consulter les avis et rapports.

### 4.3 Frontend Mobile

L’application mobile est construite avec React Native + Expo.

Elle permet :
- l’inscription / connexion OTP,
- la recherche de prestataires,
- la gestion de profil,
- la gestion des favoris,
- la consultation des services à proximité,
- la gestion des notifications,
- le paiement d’abonnement,
- la configuration des préférences.

### 4.4 Base de données

Le système utilise MySQL 8.0+ avec un schéma relationnel détaillé contenant notamment :
- users,
- otp_codes,
- refresh_tokens,
- categories,
- cities,
- neighborhoods,
- providers,
- provider_photos,
- verification_requests,
- reviews,
- review_responses,
- favorites,
- contact_events,
- reports,
- subscriptions,
- payments,
- admins,
- admin_otp_codes,
- admin_logs,
- notifications,
- notification_preferences.

Cette organisation reflète le besoin d’un système à la fois transactionnel et orienté décision d’entreprise ou de modération.

---

## 5. Stack technique

### 5.1 Backend

- Node.js >= 20
- Express 5
- MySQL 8+
- JWT (access + refresh)
- bcryptjs pour le hachage
- express-validator pour la validation
- Helmet pour la sécurité d’headers
- CORS
- compression
- winston pour le logging
- morgan pour les logs HTTP
- node-cron pour les tâches planifiées
- multer pour l’upload d’images
- Twilio, Resend, Cloudinary, Expo SDK, KPay integration

### 5.2 Frontend web admin

- React 18
- Vite
- React Router DOM
- Axios
- Recharts
- Lucide React

### 5.3 Mobile

- React Native
- Expo
- Expo Router
- Zustand pour la gestion d’état
- Async Storage et secure store
- i18next pour l’internationalisation
- Axios
- NetInfo / expo-location / expo-notifications

---

## 6. Architecture technique backend

### 6.1 Point d’entrée

Le fichier principal est :

```text
backend/server/src/server.js
```

Il charge les variables d’environnement, configure l’application Express, initialise les middlewares, branche les routes, lance les jobs planifiés et démarre le serveur.

### 6.2 Chargement des variables d’environnement

Le fichier :

```text
backend/server/src/config/env.js
```

Charge le fichier `.env` depuis le dossier backend/server, puis centralise la configuration de l’application. Il inclut :
- configuration serveur,
- base de données,
- JWT,
- Twilio,
- Cloudinary,
- KPay,
- Resend,
- Expo,
- paramètres de sécurité.

### 6.3 Sécurité et middlewares

Le backend applique :
- Helmet pour sécuriser les headers HTTP,
- CORS avec whitelist d’origines,
- limite de débit globale via `globalRateLimit`,
- validation des entrées,
- gestion centralisée des erreurs,
- protection spécifique des webhooks KPay utilisant le body brut avant le parser JSON.

### 6.4 Structure fonctionnelle

#### controllers
Les contrôleurs contiennent la logique métier et la coordination entre :
- les requêtes HTTP,
- la base de données,
- les services tiers,
- les réponses JSON.

Exemples :
- `authController.js`
- `providerController.js`
- `paymentController.js`
- `reviewController.js`

#### routes
Chaque module route expose des endpoints REST :
- `auth.js`
- `providers.js`
- `reviews.js`
- `payments.js`
- `users.js`
- `categories.js`
- `notifications.js`
- `reports.js`
- `favorites.js`
- `webhooks.js`
- `admin.js`

#### services
Les services regroupent les intégrations externes et les traitements complexes :
- `kpayService.js` : paiement mobile money,
- `imgdbService.js` : stockage ou suppression d’images,
- `notificationService.js` : notifications push / e-mail,
- `cacheService.js` : gestion du cache,
- `twilioService.js` : OTP SMS,
- `notificationService.js` : envoi de messages et rappels.

#### middleware
Les middlewares présentent :
- authentification JWT,
- gestion des erreurs,
- limitation de requêtes,
- validation de route,
- contrôle d’accès des administrateurs.

### 6.5 Contrôle de sécurité et gestion des erreurs

Le backend utilise une réponse standardisée avec gestion centralisée des exceptions via `AppError` et `asyncHandler`.

Chaque erreur est typée et renvoyée sous un format cohérent, avec :
- status HTTP,
- code applicatif,
- message convivial,
- contexte logique si nécessaire.

---

## 7. Modèle de données

### 7.1 Principes de conception

Le schéma est construit autour de plusieurs entités :
- les utilisateurs,
- les prestataires,
- les catégories et zones géographiques,
- les avis et signalements,
- les vérifications,
- les abonnements,
- les paiements et logs.

L’idée est de relier fortement les données de localisation, de service, de confiance et de monétisation.

### 7.2 Données géographiques

Le projet contient des données de villes et de quartiers :
- `cities`,
- `neighborhoods`.

Les semences SQL incluent un jeu de données de Ngaoundéré :
- villes : Ngaoundéré 1er, 2e, 3e,
- nombreux quartiers et localités.

### 7.3 Modèle utilisateur

La table `users` contient :
- téléphone,
- état de vérification du téléphone,
- prénom et nom,
- avatar,
- statut du compte,
- token push Expo,
- dernière connexion.

### 7.4 Modèle prestataire

La table `providers` contient :
- identité du prestataire,
- catégorie associée,
- ville et quartier,
- numéros de téléphone / WhatsApp,
- disponibilité,
- horaires,
- plan abonnement,
- statut de vérification,
- score de confiance,
- score de classement,
- index de réputation.

Important : plusieurs champs de score (review_count, recommend_count, trust_score, ranking_score) sont dénormalisés afin d’améliorer la performance de recherche et d’affichage.

### 7.5 Avis, signalements et confiance

- `reviews` : avis clients sur les prestataires,
- `review_responses` : réponse du prestataire,
- `reports` : signalements générés par les utilisateurs,
- `contact_events` : suivi des vues, clics téléphone, clics WhatsApp.

Ce mécanisme donne un système robuste de réputation et de modération.

### 7.6 Vérification et documents

La table `verification_requests` stocke :
- les images de CNI,
- le statut de la demande,
- le résultat de la validation,
- le note du modérateur,
- suppression automatique des pièces après un certain délai.

### 7.7 Paiement et abonnement

Les tables `subscriptions` et `payments` permettent de gérer :
- les plans,
- les montants,
- les paiements KPay,
- le statut des transactions,
- la validité des abonnements.

### 7.8 Logs et sécurité

Les tables `admin_logs`, `otp_codes`, `refresh_tokens` assurent :
- la sécurité du compte,
- l’historique d’actions admin,
- la révocation des tokens,
- le nettoyage automatique des données expirées.

---

## 8. Sécurité du projet

Le backend prend en compte plusieurs niveaux de sécurité :

### 8.1 Authentification

- Authentification mobile via OTP SMS,
- JWT access token,
- refresh token stocké en base,
- tokens liés à l’appareil via `device_info`,
- un mécanisme de révocation et d’expiration.

### 8.2 Authentification admin

- Connexion par email + mot de passe,
- OTP transmis par e-mail via Resend,
- JWT spécifique pour les admins.

### 8.3 Protection des endpoints

- validation des entrées via express-validator,
- limitation de débit (rate limiting),
- CORS restreint,
- restriction des tailles de payload,
- sécurité des headers HTTP,
- gestion des raw body pour les webhooks.

### 8.4 Données sensibles

Les fichiers `.env` et les secrets ne doivent pas être commités. Les variables nécessaires comprennent :
- JWT secret,
- DB credentials,
- KPay credentials,
- Twilio credentials,
- Cloudinary credentials,
- Resend API key,
- Expo token.

---

## 9. Flux métier détaillé

### 9.1 Inscription utilisateur

1. l’utilisateur fournit un numéro de téléphone,
2. le backend valide le format camerounais,
3. envoie un OTP via Twilio,
4. l’utilisateur valide le code,
5. le système crée le compte,
6. le backend génère un access token et un refresh token,
7. l’utilisateur peut maintenant accéder à l’application.

### 9.2 Recherche de prestataires

La recherche s’appuie sur :
- mot-clé,
- catégorie,
- ville,
- quartier,
- disponibilité,
- statut vérifié,
- pagination.

Le backend construit une requête SQL dynamique avec conditions et utilise des filtres sur le statut de publication, l’activité et le niveau de vérification.

### 9.3 Création de fiche prestataire

Un utilisateur connecté peut créer une fiche prestataire.

Le backend :
- vérifie qu’il n’a pas déjà une fiche active,
- valide les informations obligatoires,
- télécharge éventuellement la photo profil dans Cloudinary,
- insère la fiche dans la base,
- réinitialise le cache s’il existe.

### 9.4 Vérification prestataire

Un prestataire peut demander une vérification avec des images de sa CNI.

Le flux est :
1. upload des pièces joints,
2. insertion d’une demande de vérification,
3. passage du statut du prestataire à `pending`,
4. modération par l’admin,
5. approbation ou rejet,
6. notification du prestataire.

### 9.5 Avis et réputation

Un client peut donner un avis sur un prestataire :
- `recommend`,
- `neutral`,
- `discourage`.

Le système met ensuite à jour les statistiques de confiance et le classement du prestataire.

### 9.6 Abonnement et paiement

Un prestataire peut souscrire à un plan premium avec paiement via KPay.

Le flux est :
1. vérification de la validité du plan,
2. création d’un enregistrement de paiement,
3. appel à l’API KPay,
4. réception du statut,
5. activation du plan si paiement réussi,
6. mise à jour des données de plan et dates d’expiration.

### 9.7 Webhooks KPay

Le webhook KPay est traité par un routeur dédié. Il permet de confirmer le statut d’un paiement et de mettre à jour le système en temps réel.

Important : le body est traité en `raw` avant le JSON parsing global pour garantir la vérification de signature et la fiabilité du traitement.

---

## 10. API REST

### 10.1 Préfixe global

```text
/api/v1
```

### 10.2 Authentification

#### POST `/api/v1/auth/send-otp`
- Envoi d’un code OTP par SMS.
- Paramètres : `phone`.

#### POST `/api/v1/auth/verify-otp`
- Vérification du code OTP.
- Paramètres : `phone`, `code`, `deviceInfo`.

#### POST `/api/v1/auth/refresh`
- Renouvellement du token JWT.

#### POST `/api/v1/auth/logout`
- Invalidation du refresh token.

#### GET `/api/v1/auth/me`
- Retourne le profil utilisateur connecté.

### 10.3 Prestataires

#### GET `/api/v1/providers`
- Recherche et filtrage des prestataires.

#### GET `/api/v1/providers/nearby`
- Recherche autour d’une zone géographique.

#### GET `/api/v1/providers/me`
- Retourne ma fiche prestataire.

#### GET `/api/v1/providers/:id`
- Détails d’un prestataire.

#### GET `/api/v1/providers/:id/contact`
- Récupère les moyens de contact.

#### GET `/api/v1/providers/:id/stats`
- Statistiques d’un prestataire.

#### POST `/api/v1/providers`
- Création d’une fiche prestataire.

#### PUT `/api/v1/providers/:id`
- Mise à jour d’une fiche.

#### DELETE `/api/v1/providers/:id`
- Suppression logique.

#### POST `/api/v1/providers/geo`
- Ajout de géolocalisation.

#### DELETE `/api/v1/providers/geo`
- Suppression de géolocalisation.

### 10.4 Avis

#### GET `/api/v1/reviews`
- Liste des avis.

#### POST `/api/v1/reviews`
- Ajout d’un avis.

#### POST `/api/v1/reviews/:id/response`
- Réponse du prestataire à un avis.

#### DELETE `/api/v1/reviews/:id`
- Suppression d’un avis.

### 10.5 Favoris

#### GET `/api/v1/favorites`
- Liste des favoris.

#### POST `/api/v1/favorites`
- Ajouter un prestataire aux favoris.

#### DELETE `/api/v1/favorites/:providerId`
- Retirer un favori.

### 10.6 Paiements

#### POST `/api/v1/payments/initiate`
- Démarre un paiement pour un plan.

#### GET `/api/v1/payments/:id/status`
- Vérifie le statut d’un paiement.

### 10.7 Notifications

#### GET `/api/v1/notifications`
- Liste des notifications.

### 10.8 Utilisateurs

#### PUT `/api/v1/users/me`
- Modifier le profil.

#### POST `/api/v1/users/avatar`
- Télécharger un avatar.

#### POST `/api/v1/users/push-token`
- Enregistrer le token push Expo.

#### GET `/api/v1/users/notification-preferences`
- Obtenir les préférences.

#### PUT `/api/v1/users/notification-preferences`
- Modifier les préférences.

### 10.9 Admin

#### POST `/api/v1/admin/auth/login`
- Démarrer la connexion admin.

#### POST `/api/v1/admin/auth/verify-otp`
- Vérification du code OTP admin.

#### GET `/api/v1/admin/auth/me`
- Profil admin connecté.

#### GET `/api/v1/admin/stats/dashboard`
- Statistiques globales.

#### GET `/api/v1/admin/users`
- Liste des utilisateurs.

#### GET `/api/v1/admin/providers`
- Liste des prestataires.

#### GET `/api/v1/admin/verifications`
- Demandes de vérification.

#### GET `/api/v1/admin/reviews`
- Avis soumis.

#### GET `/api/v1/admin/reports`
- Signalements.

#### GET `/api/v1/admin/subscriptions`
- Abonnements.

#### GET `/api/v1/admin/categories`
- Catégories.

#### GET `/api/v1/admin/payments`
- Paiements.

---

## 11. Jobs planifiés

Le backend démarre plusieurs tâches automatiques via `node-cron` :

- suppression des CNI après 24 heures,
- rappels d’abonnement dans 3 jours,
- désactivation des plans expirés,
- nettoyage des tokens OTP et refresh,
- relances sur prestataires inactifs.

Ces jobs garantissent la propreté du système et la bonne gestion des données temporaires.

---

## 12. Déploiement et environnement

### 12.1 Prérequis

- Node.js 20+
- npm ou pnpm
- MySQL 8+
- accès à un compte Cloudinary,
- compte Twilio,
- compte KPay,
- compte Resend,
- compte Expo pour push notifications.

### 12.2 Variables d’environnement backend

Le fichier `.env` backend contient au minimum :

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=adma_db
JWT_SECRET=...
ADMIN_JWT_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
KPAY_API_KEY=...
KPAY_SECRET_KEY=...
KPAY_BASE_URL=https://admin.kpay.site/api/v1
KPAY_WEBHOOK_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
EXPO_ACCESS_TOKEN=...
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### 12.3 Installation backend

```bash
cd backend/server
npm install
npm run dev
```

Pour démarrer en mode production :

```bash
npm start
```

### 12.4 Installation frontend admin

```bash
cd frontend/admin
npm install
npm run dev
```

Build de production :

```bash
npm run build
```

### 12.5 Installation mobile

```bash
cd frontend/mobile
npm install
npx expo start
```

Pour build native :

```bash
npx expo run:android
npx expo run:ios
```

### 12.6 Base de données

Les migrations et seeds se trouvent dans :

```text
backend/database/migrations/
backend/database/seeds/
```

La structure de base est créée par SQL. Les données initiales incluent les villes, quarts et catégories.

---

## 13. Déploiement recommandé

### 13.1 Environnement de production

Pour production, on recommande :
- un backend Node.js sur un VPS ou une instance cloud,
- une base MySQL hébergée (MySQL Cloud, Cloud SQL, RDS, etc.),
- stockage de fichiers/images sur Cloudinary,
- CDN / reverse proxy si besoin,
- HTTPS obligatoire,
- mécanisme de surveillance de logs,
- environnement séparé pour test et prod,
- règle de sécurité sur les données privées.

### 13.2 Bonnes pratiques

- jamais exposer les clés secret dans le code source,
- utiliser des variables d’environnement ou des secrets manager,
- configurer CORS strictement,
- activer les logs et alertes,
- sécuriser les webhooks avec signature,
- sauvegarder régulièrement la base de données,
- maintenir les dépendances à jour,
- surveiller les erreurs applicatives et les requêtes lentes.

---

## 14. Points d’attention techniques

### 14.1 Complexité de la recherche

La recherche est basée sur des requêtes SQL avec filtres, ordonnancement sur score et pagination. Cela est adapté à une petite ou moyenne base de données, mais il faudra penser à l’optimisation si la plateforme grandit.

### 14.2 Scores et denormalisation

La logique de `trust_score` et `ranking_score` est calculée en base. Cela est performant, mais il faut rester vigilant sur les triggers et les recalculs à chaque modification. L’évolution future pourrait passer par une logique plus centralisée dans un service dédié.

### 14.3 Traitement des images

Les images sont stockées dans Cloudinary. La suppression et la gestion des fichiers doivent être surveillées pour éviter des doublons ou des ressources orphelines.

### 14.4 Notifications

Les notifications push et les e-mails transactionnels peuvent être coûteux à l’échelle, il faut surveiller les taux d’envoi et les préférences utilisateur.

### 14.5 Mises à jour et évolutions

Les modules à surveiller pour expansion :
- attribution géographique avancée,
- messagerie interne,
- paiement plus avancé,
- système de recommandation ML,
- analytics et dashboards plus poussés,
- passage vers une architecture microservices si nécessaire.

---

## 15. Risques et limites actuels

Le projet est solide dans sa logique de base, mais certaines limites existent naturellement :
- dépendance forte à plusieurs services externes,
- besoin de surveillance sur le paiement réel,
- système de recherche simple mais pas encore ultra-optimisé pour très gros volumes,
- schéma de scoring à améliorer selon la croissance,
- besoin d’une gestion de sécurité plus avancée à mesure que l’application grandit.

---

## 16. État du projet

Le dépôt contient déjà la structure de base d’une application complète et fonctionnelle, avec :
- backend API robuste,
- modules de business adaptés au contexte camerounais,
- intégrations de paiement et notifications,
- architecture multi-plateformes,
- données localisées,
- dashboard admin.

Le projet est donc en phase de développement/validation avancée, avec une base solide pour le lancement, la mise en production et l’évolution.

---

## 17. Propositions d’amélioration

Voici quelques pistes de valorisation du projet :
- ajout d’une messagerie directe entre client et prestataire,
- système de réservation / prise de rendez-vous,
- géolocalisation en temps réel,
- analytics avancés,
- campagnes marketing et CRM,
- intégration de plusieurs opérateurs de paiement,
- support multilingue complet sur l’interface,
- optimisation SEO / recherche locale,
- votes de qualité par catégorie,
- modération de contenus plus avancée.

---

## 18. Conclusion

ADMA est une plateforme locale de services qui combine :
- une logique business claire,
- une architecture technique moderne,
- des intégrations utiles pour l’Afrique francophone et le Cameroun,
- une forte logique de confiance et de vérification,
- un potentiel de croissance commercial et technique important.

Le projet a été pensé non seulement pour répondre à un besoin fonctionnel, mais aussi pour être évolutif, traçable, sécurisé et préparé à la monétisation.

---

## 19. Références internes

- `backend/server/src/server.js` : point d’entrée du backend
- `backend/server/src/config/env.js` : variables d’environnement
- `backend/server/src/routes/` : endpoints API
- `backend/server/src/controllers/` : logique métier
- `backend/server/src/services/` : intégrations externes
- `backend/database/migrations/001_schema.sql` : schéma principal
- `backend/database/seeds/` : données initiales
- `frontend/admin/src/` : interface admin
- `frontend/mobile/app/` : application mobile
- `privacy-policy/` : politique de confidentialité

---

## 20. Commandes rapides

### Backend

```bash
cd backend/server
npm install
npm run dev
```

### Admin

```bash
cd frontend/admin
npm install
npm run dev
```

### Mobile

```bash
cd frontend/mobile
npm install
npx expo start
```

---

## 21. Licence et propriété

Ce dépôt est un projet de développement interne / applicatif, sans licence explicite fournie dans le dépôt. Avant toute mise en production ou diffusion publique, il est conseillé de vérifier les droits de propriété intellectuelle, la licence des composants tiers et les règles de conformité des services utilisés.

---

## 22. Note de développement

Ce README a été rédigé pour servir à la fois de document :
- utilisateur / gestionnaire non technique,
- architecte technique,
- développeur backend/frontend,
- personne chargée de la mise en production.

Il vise à expliquer non seulement le produit final, mais aussi les fondements techniques et les choix d’architecture qui rendent ADMA viable, évolutif et prêt pour un environnement réel.
# adma-app
