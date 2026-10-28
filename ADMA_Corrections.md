# Journal des corrections UI/UX ADMA

## État initial — 28 octobre 2026

- Branche active : `fix/audit-uiux`.
- Dernier commit : `f75a4b8 feat(errors): système de modals centralisé, traduction des codes API, ErrorBoundary`.
- Ce commit contient le chantier de Phase 1. Aucun changement suivi non commité ni travail de Phase 2 inachevé n'était présent.
- Fichiers non suivis à l'arrivée : `ADMA_Audit_UIUX.md` (rapport fourni) et `frontend/mobile/package-lock.json`. Ils n'ont pas été modifiés.
- `git diff --stat` était vide. Le seul changement de Phase 1 dans `search.js` retirait l'import `Alert`; ses `catch` réseau restent à traiter en Phase 2.

## Suivi des phases

| Phase | Statut | Fichiers modifiés dans cette phase | Décisions / points humains |
|---|---|---|---|
| Étape 0 — état des lieux | Terminée | `ADMA_Corrections.md` | État Git et rapport d'audit examinés. |
| Phase 1 — erreurs et modals | Terminée | `frontend/mobile/services/apiErrors.js`, `frontend/mobile/services/api.js`, `frontend/mobile/i18n/fr.json`, `frontend/mobile/i18n/en.json`, `frontend/mobile/i18n/ful.json` | Trois traductions Fulfulde sont provisoirement en français et nécessitent une validation linguistique : `errors.CATEGORY_IN_USE`, `errors.DOWNGRADE_NOT_ALLOWED`, `errors.INVALID_TOKEN`. Aucun changement backend. |
| Phase 2 — erreurs silencieuses | Terminée | `frontend/mobile/app/(tabs)/search.js`, `frontend/mobile/app/(tabs)/profile.js`, `frontend/mobile/app/(tabs)/favorites.js`, `frontend/mobile/app/(tabs)/index.js`, `frontend/mobile/app/map.js`, `frontend/mobile/app/notifications/index.js`, `frontend/mobile/app/provider/create.js`, `frontend/mobile/app/provider/edit.js`, `frontend/mobile/app/provider/[id].js`, `frontend/mobile/app/settings/legal.js`, `frontend/mobile/app/settings/support.js`, `frontend/mobile/app/verification/index.js`, `frontend/mobile/components/ui/AdmaModal.jsx`, `frontend/mobile/hooks/useLocation.js`, `frontend/mobile/i18n/index.js`, `frontend/mobile/services/api.js`, `frontend/mobile/services/cache.js`, `frontend/mobile/store/auth.store.js`, `frontend/mobile/store/notification.store.js` | Les métadonnées de recherche restent un préchargement best-effort parce qu'elles sont mises en cache ; les erreurs des opérations de l'utilisateur sont visibles. Le polling et l'affichage des erreurs du paiement restent en Phase 3. |
| Phase 3 — paiement et abonnements | Terminée | `frontend/mobile/app/subscription/plans.js`, `frontend/mobile/app/subscription/payment.js`, `frontend/mobile/constants/config.js`, catalogues i18n | Le backend accepte les changements différés entre forfaits payants uniquement (`/payments/initiate` valide `premium`, `professional`, `enterprise`); il n'autorise pas de retour gratuit. |
| Phase 4 — contraste et accessibilité | Terminée | Composants UI et écrans mobile, `frontend/mobile/constants/colors.js`, `frontend/mobile/app/settings/support.js`, catalogues i18n | Contraste, cibles tactiles, rôles d'accessibilité, icônes de badge et entrées FAQ harmonisés. |
| Phase 5 — démarrage, clavier, safe area et performance | Terminée | `frontend/mobile/app/_layout.js`, `frontend/mobile/components/ui/LoadingScreen.js`, écrans login, paiement, avis et signalement | Loader sans logo dupliqué, prise en compte du clavier/safe area, segment de forfait adaptable et erreurs de masquage du splash journalisées. |
| Phase 6 — configuration et dépendances | Terminée | `frontend/mobile/app.json`, `frontend/mobile/.gitignore`, `frontend/mobile/package.json` | Permissions non utilisées bloquées dans la configuration Expo, dépendance directe inutilisée retirée et passage au workflow CNG : les projets natifs sont générés au build plutôt que conservés dans le dépôt. |

## Phase 1 — constats et corrections

- Vérifié : file d'attente et actions `show`/`confirm`/`dismiss` du store ; modal monté une fois à la racine ; hooks avant le retour conditionnel ; abonnement `BackHandler` nettoyé avec `sub.remove()` ; rôles/accessibilité et variantes `error`, `warning`, `success`, `info`, `network`, `session`, `permission`, `payment`.
- Vérifié : `showAppModal` reste une façade compatible et `setModalStateRef` n'existe plus. Aucun `Alert.alert`, `Alert.prompt`, `ToastAndroid` ou `alert()` dans le code mobile.
- Vérifié : ErrorBoundary traduit et listener NetInfo monté globalement.
- Corrigé : ajouté le mapping et les clés de traduction des codes backend `CATEGORY_IN_USE`, `DOWNGRADE_NOT_ALLOWED` et `INVALID_TOKEN` (sans modification du backend).
- Corrigé : une erreur de timeout utilise maintenant `errors.serverWakingUp`, déjà traduit dans les trois catalogues.
- Corrigé : l'échec du refresh appelle maintenant `useAuthStore.getState().logout()` et affiche le modal de session bloquant.
- Vérification statique après correction : 58 codes `AppError` backend couverts ; toutes les clés utilisées par le mapping existent dans les trois catalogues ; parité FR/EN/FUL à 644 clés ; aucun popup natif interdit trouvé.
- Validation : `node --check` sur les deux fichiers JS modifiés et `git diff --check` passent. Aucun script de lint n'est défini dans `frontend/mobile/package.json`.
- Validation Expo : `EXPO_OFFLINE=1 npx --yes expo-doctor` termine avec 17/18 contrôles réussis. L'unique échec signale que les dossiers natifs Android/iOS coexistent avec les propriétés Prebuild dans `app.json`; Expo indique que ces propriétés ne seront pas synchronisées en build. C'est un état préexistant à examiner en Phase 6, sans correction dans cette phase.

## Phase 2 — terminée

- Recherche, profil et favoris : distinguer l'échec réseau de l'état vide et proposer une reprise sans masquer les résultats existants.
- Carte : callback d'échec MapLibre et nouvelle tentative de rechargement ; erreurs de récupération des prestataires visibles.
- Création et vérification : refus d'accès GPS / galerie avec modal permission qui ouvre les paramètres ; erreurs de sélection d'image visibles.
- Fiche prestataire : échec d'ouverture appel / WhatsApp avec option de contact alternative quand elle est disponible.
- L'ouverture des paramètres depuis le modal signale maintenant son propre échec au lieu de le supprimer.
- Étendu aux mêmes risques d'état vide trompeur : accueil, notifications, fiche détaillée prestataire, formulaire de modification et ouverture des liens support/légaux.
- Erreur d'ouverture des liens externes documentaires et d'assistance désormais visible. L'échec d'une action de lecture ou de modification d'une notification est conservé dans le store et présenté avec une reprise.
- Validation : 22 fichiers JS/JSX modifiés analysés sans erreur par Babel ; `git diff --check` passe ; le bundle Android `EXPO_OFFLINE=1 npx expo export --platform android --output-dir /tmp/adma-mobile-phase2-export-retry --max-workers 2` a réussi (3 803 modules, bundle Hermes 8,03 MB).
- Validation Expo : 17/18 contrôles passent ; l'unique avertissement préexistant est l'incompatibilité de synchronisation Prebuild avec les dossiers natifs existants (voir Phase 1 et traiter en Phase 6). Aucun script de lint n'est défini.
- Parité i18n conservée : 644 clés en français, anglais et fulfulde ; aucun nouveau texte de traduction n'a été ajouté en Phase 2.

### Catch silencieux conservés avec justification

- `i18n/index.js` : lecture/écriture AsyncStorage de la langue ; la locale système et la langue active restent disponibles si la persistance échoue.
- `app/_layout.js` : préparation/masquage du splash et requête de réveil facultative du serveur ; ces actions ne sont pas des parcours utilisateur, et le chargement normal expose les erreurs API.
- `services/api.js` : suppression SecureStore idempotente après déconnexion ; elle ne doit pas bloquer la suppression de l'autre jeton. L'import Expo Router de redirection journalise maintenant tout échec.
- `app/provider/[id].js` : événements de consultation et de clic contact sont des métriques best-effort ; ils ne doivent pas empêcher d'afficher la fiche ni de lancer le contact.
- `app/(tabs)/search.js` : préchargement des métadonnées facultatif ; données mises en cache conservées, les appels de recherche principaux ont leur propre état d'erreur/retry.
- `services/cache.js`, `store/auth.store.js`, `app/onboarding/index.js` : erreurs de cache récupérable, recherche de fiche optionnelle à la connexion, déconnexion côté serveur et persistance de la fin de l'onboarding sont commentées au point d'appel ; l'état utilisateur ou le flux principal continue sans perte de données serveur.
- `app/subscription/plans.js` et `app/subscription/payment.js` : échecs de récupération du tarif/statut de changement et retries d'interrogation USSD restent à corriger avec la Phase 3 (états prix/paiement), pour ne pas afficher de prix ou de statut inventé.
- Aucun catch vide sans justification ne subsiste parmi les parcours de Phase 2 prioritaires. Aucun `Alert.alert`, `Alert.prompt`, `ToastAndroid` ou `alert()` dans le code mobile.

## Phase 3 — terminée

- L'écran forfaits distingue désormais une erreur de chargement des tarifs d'une absence confirmée de fiche; l'erreur de changement programmé dispose aussi de son propre état/retry.
- La grille tarifaire reste issue de `/providers/me/pricing`, avec validation minimale de sa forme; le montant affiché à l'étape de paiement est remplacé par le montant confirmé par l'API d'initiation.
- L'écran paiement conserve localement l'identifiant de paiement et ses paramètres; à la réouverture, il reprend le polling sans créer une nouvelle transaction. Un paiement encore en attente après expiration du délai de polling propose une reprise explicite.
- Les erreurs temporaires du polling, d'ouverture du checkout et du stockage local sont présentées sans prétendre que le paiement a échoué. Les états du paiement et des changements programmés sont traduits dans les trois langues.
- Confirmation backend pour l'offre gratuite : `paymentController.js` exige un `planId` appartenant à `premium`, `professional`, `enterprise`; `payments.js` applique la même validation. `getMyPricing` retourne bien `data: null` pour une fiche absente. Aucun changement backend.
- Le bouton d'annulation d'un changement programmé vérifie la réponse API avant d'afficher le succès. Les montants statiques inutilisés ont été retirés; les tarifs affichés proviennent de l'API.

## Phase 4 — terminée

- Contraste des textes, boutons, icônes et bordures renforcé dans les écrans mobiles; `primaryText` sur blanc atteint 5,04:1. L'icône d'action testée atteint 3,83:1, au-dessus du seuil 3:1 applicable aux composants graphiques.
- Les boutons communs ont une cible tactile minimale de 44 dp et le rôle d'accessibilité bouton. Les cibles d'annulation et les éléments concernés par la navigation ont également été agrandis.
- Badge de vérification harmonisé avec Lucide et les couleurs de l'interface. Les entrées FAQ avis et signalement sont distinctes et traduites en FR/EN/FUL.

## Phase 5 — terminée

- Loader simplifié pour éviter l'affichage du logo en double; les erreurs de masquage du splash sont journalisées.
- Clavier Android pris en compte sur l'écran de connexion; formulaires d'avis et de signalement protégés par le padding de safe area.
- Le segment de forfait tient compte de la largeur de l'écran pour rester utilisable sur les petits appareils.

## Phase 6 — terminée

- Permissions caméra, microphone, stockage externe et démarrage au boot bloquées dans la configuration Expo. Les usages observés conservent uniquement la galerie d'images et la localisation au premier plan.
- `react-native-worklets-core` retiré des dépendances directes, sans usage trouvé dans l'application. `react-dom` et `react-native-web` sont conservés pour la cible web configurée.
- Après confirmation, dossier Android natif supprimé et `android/`/`ios/` ajoutés au `.gitignore` pour adopter Expo CNG. Aucun dossier iOS n'existait. Les plateformes natives seront régénérées depuis `app.json` et les plugins lors des builds.
- Aucun changement backend.

## Validation finale des phases 3 à 6

- Transform Babel Expo réussi sur les 38 fichiers JS/JSX modifiés; export Android réussi avec 3 802 modules et bundle Hermes de 8,04 MB.
- Parité i18n vérifiée : 667 clés en français, anglais et fulfulde. Fichiers JSON valides et `git diff --check` sans erreur.
- Permissions bloquées présentes dans `app.json`; aucune plateforme native générée ne reste dans l'arbre de travail.
- Après le passage à CNG, Expo Doctor passe 18/18 contrôles et l'export Android passe avec 3 802 modules et un bundle Hermes de 8,04 MB.
- Aucun script de lint ou de test n'est défini dans `frontend/mobile/package.json`.
