# ADMA — Documentation des endpoints API
Base URL : `http://localhost:5000/api/v1`  
En production : `https://ton-api.onrender.com/api/v1`

Légende : 🔓 Public | 🔐 Authentifié (JWT) | 🛡️ Admin JWT

---

## AUTH

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/auth/send-otp` | 🔓 | Envoyer un code OTP par SMS |
| POST | `/auth/verify-otp` | 🔓 | Vérifier le code OTP → retourne access + refresh token |
| POST | `/auth/refresh` | 🔓 | Renouveler l'access token via refresh token (header `X-Refresh-Token`) |
| POST | `/auth/logout` | 🔓 | Révoquer le refresh token |
| GET  | `/auth/me` | 🔐 | Profil de l'utilisateur connecté |

---

## UTILISATEURS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| PUT    | `/users/me` | 🔐 | Modifier prénom / nom |
| POST   | `/users/avatar` | 🔐 | Upload photo de profil (multipart) |
| POST   | `/users/push-token` | 🔐 | Enregistrer le token Expo pour les notifications push |
| GET    | `/users/notification-preferences` | 🔐 | Récupérer les préférences de notifications |
| PUT    | `/users/notification-preferences` | 🔐 | Modifier les préférences de notifications |
| DELETE | `/users/me` | 🔐 | Supprimer son compte |

---

## PRESTATAIRES

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET    | `/providers` | 🔓 | Recherche standard (filtres : q, categoryId, cityId, neighborhoodId, isVerified, availability, page) |
| GET    | `/providers/nearby` | 🔓 | Recherche géographique (params : lat, lng, categoryId, page) |
| GET    | `/providers/me` | 🔐 | Ma fiche prestataire |
| GET    | `/providers/:id` | 🔓 | Détail d'une fiche |
| GET    | `/providers/:id/contact` | 🔐 | Coordonnées de contact (déclenche un événement) |
| GET    | `/providers/:id/stats` | 🔐 | Statistiques de ma fiche |
| POST   | `/providers` | 🔐 | Créer ma fiche (multipart avec photo optionnelle) |
| PUT    | `/providers/:id` | 🔐 | Modifier ma fiche (multipart avec photo optionnelle) |
| DELETE | `/providers/:id` | 🔐 | Supprimer ma fiche |
| POST   | `/providers/geo` | 🔐 | Définir / mettre à jour la zone de service GPS |
| DELETE | `/providers/geo` | 🔐 | Supprimer la zone de service GPS |
| POST   | `/providers/verification-request` | 🔐 | Soumettre une demande de vérification CNI (multipart : cniFront, cniBack) |

---

## CATÉGORIES / VILLES / QUARTIERS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/categories` | 🔓 | Liste toutes les catégories avec nombre de prestataires |
| GET | `/categories/cities` | 🔓 | Liste des villes |
| GET | `/categories/neighborhoods?cityId=1` | 🔓 | Liste des quartiers (filtrable par ville) |

---

## AVIS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET    | `/reviews?providerId=X&page=1` | 🔓 | Avis d'un prestataire |
| POST   | `/reviews` | 🔐 | Déposer un avis (body : providerId, verdict, comment) |
| POST   | `/reviews/:id/response` | 🔐 | Répondre à un avis (prestataire uniquement) |
| DELETE | `/reviews/:id` | 🔐 | Supprimer son avis |

---

## FAVORIS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET    | `/favorites` | 🔐 | Liste de mes favoris |
| POST   | `/favorites` | 🔐 | Ajouter un favori (body : providerId) |
| DELETE | `/favorites/:providerId` | 🔐 | Retirer un favori |

---

## ÉVÉNEMENTS DE CONTACT

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/contacts` | 🔓 | Enregistrer un événement (body : providerId, eventType) |

Valeurs `eventType` : `profile_view` · `phone_click` · `whatsapp_click`

---

## NOTIFICATIONS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET    | `/notifications?page=1` | 🔐 | Mes notifications |
| PATCH  | `/notifications/:id/read` | 🔐 | Marquer une notification comme lue |
| PATCH  | `/notifications/read-all` | 🔐 | Tout marquer comme lu |

---

## PAIEMENTS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/payments/initiate` | 🔐 | Initier un paiement KPay (body : planId, operator, phoneNumber) |
| GET  | `/payments/:id/status` | 🔐 | Vérifier le statut d'un paiement |

Valeurs `planId` : `premium` · `professional` · `enterprise`  
Valeurs `operator` : `orange_cmr` · `mtn_momo_cmr`

---

## SIGNALEMENTS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/reports` | 🔐 | Signaler une fiche ou un avis (body : targetType, targetId, reason, description) |

---

## WEBHOOKS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/webhooks/kpay` | 🔓 | Webhook KPay — URL à configurer dans le dashboard KPay |

---

## ADMIN (Dashboard uniquement)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST   | `/admin/auth/login` | 🔓 | Connexion admin étape 1 (email + password) |
| POST   | `/admin/auth/verify-otp` | 🔓 | Connexion admin étape 2 (OTP email) |
| GET    | `/admin/auth/me` | 🛡️ | Profil admin connecté |
| GET    | `/admin/stats/dashboard` | 🛡️ | Statistiques globales |
| GET    | `/admin/users` | 🛡️ | Liste des utilisateurs |
| PATCH  | `/admin/users/:id/suspend` | 🛡️ | Suspendre un compte |
| PATCH  | `/admin/users/:id/activate` | 🛡️ | Réactiver un compte |
| GET    | `/admin/providers` | 🛡️ | Liste des fiches prestataires |
| PATCH  | `/admin/providers/:id/suspend` | 🛡️ | Suspendre une fiche |
| PATCH  | `/admin/providers/:id/activate` | 🛡️ | Activer une fiche |
| GET    | `/admin/verifications` | 🛡️ | Demandes de vérification en attente |
| PATCH  | `/admin/verifications/:id/approve` | 🛡️ | Approuver une vérification (body : badgeType) |
| PATCH  | `/admin/verifications/:id/reject` | 🛡️ | Rejeter une vérification (body : reason) |
| GET    | `/admin/reviews` | 🛡️ | Liste des avis |
| PATCH  | `/admin/reviews/:id/hide` | 🛡️ | Masquer un avis |
| PATCH  | `/admin/reviews/:id/restore` | 🛡️ | Restaurer un avis |
| GET    | `/admin/reports` | 🛡️ | Signalements en attente |
| PATCH  | `/admin/reports/:id/resolve` | 🛡️ | Marquer comme résolu |
| PATCH  | `/admin/reports/:id/dismiss` | 🛡️ | Ignorer le signalement |
| GET    | `/admin/subscriptions` | 🛡️ | Liste des abonnements |
| POST   | `/admin/subscriptions/activate` | 🛡️ | Activer un abonnement manuellement |
| GET    | `/admin/categories` | 🛡️ | Liste des catégories |
| POST   | `/admin/categories` | 🛡️ | Créer une catégorie |
| PATCH  | `/admin/categories/:id` | 🛡️ | Modifier une catégorie |
| GET    | `/admin/payments` | 🛡️ | Liste des paiements |

---

## Headers requis

```
# Pour les routes authentifiées
Authorization: Bearer <accessToken>

# Pour le refresh token
X-Refresh-Token: <refreshToken>

# Pour les uploads (multipart)
Content-Type: multipart/form-data
```

---

## Health check

```
GET /health
→ { status: "ok", version: "1.0.0", env: "development" }
```
