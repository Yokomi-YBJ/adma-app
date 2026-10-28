# AUDIT COMPLET UI / UX & ARCHITECTURE CLIENT — APPLICATION MOBILE ADMA

> **Date de l'audit** : 28 octobre 2026  
> **Auditeur** : Auditeur Senior UI/UX Mobile & Expert React Native / Expo  
> **Version analysée** : 1.0.0 (Expo SDK 54, React Native 0.81.5, React 19.1, Expo Router 6)  
> **Cible produit** : Plateforme locale de mise en relation de proximité — Ngaoundéré / Région de l'Adamaoua (Cameroun)  
> **Mode d'analyse** : Statique approfondi, lecture seule, inspection exhaustive du code source frontend & backend  

---

## 1. Résumé exécutif

L'application mobile Adma présente des bases architecturales solides et une volonté indéniable de répondre aux contraintes du terrain camerounais : mise en place d'un cache local SQLite avec TTL, intégration d'illustrations SVG contextualisées, support pionnier du Fulfulde (565 clés traduites en parité avec le français et l'anglais), pagination sur les listes longues et intégration du paiement mobile money via GeniusPay/PawaPay.

Cependant, **l'application est encore loin du niveau d'excellence 10/10 attendu en UI et en UX**. Le verdict sans complaisance révèle des failles de conception critiques :

1. **Gestion des erreurs disparate et archaïque** : Présence persistante d'`Alert.alert` natifs dans les parcours financiers sensibles (abonnements/paiements), plus de 35 blocs `catch` silencieux qui étouffent les incidents réseau, aucune table de correspondance des codes applicatifs du backend (`AppError`), et des messages d'erreur serveur bruts en français affichés même lorsque l'utilisateur est en anglais ou en fulfulde.
2. **Accessibilité visuelle compromise (WCAG AA)** : La couleur d'accent principale turquoise (`#5FC2BA`), omniprésente sur fond blanc (textes de boutons secondaires/ghost, labels d'en-tête, liens d'action), offre un ratio de contraste d'à peine **2.13:1**, en infraction flagrante avec la norme WCAG AA (minimum exigé : 4.5:1 pour le texte normal, 3.0:1 pour les composants d'interface).
3. **Absence d'infrastructure de résilience globale** : Aucun `ErrorBoundary` React global ni écran de secours en cas de crash, un splash screen qui « clignote » (double affichage du logo dû à une dissimulation prématurée du splash natif avant un loader animé artificiel), et un composant modal d'erreur (`AppModal`) non empilable, dépourvu d'animation Reanimated 4, ignorant le clavier ouvert et fermable sans action corrective.
4. **Bugs de parcours et incohérences tarifaires** : Copie-coller textuels dans la FAQ Support (questions/réponses d'inscription dupliquées pour les avis), incohérence entre les tarifs de fidélité dans le code client (`price: 1000/2500/5000` dans [config.js](file:///home/yokomi/adma-app/frontend/mobile/constants/config.js#L4-L9)) et la réalité métier du backend (`1300/3900/7500`), et blocage total du polling de paiement USSD dès que l'utilisateur quitte l'écran.

### Synthèse des notes globales

| Domaine | Note | Statut | Verdict synthétique |
|---|:---:|:---:|---|
| **Interface Utilisateur (UI)** | **6.5 / 10** | ⚠️ À consolider | Design moderne et soigné dans l'ensemble, mais ratio de contraste #5FC2BA illégal (2.13:1), typographie native non brandée, et disparate dans l'iconographie. |
| **Expérience Utilisateur (UX)** | **6.0 / 10** | ⚠️ À consolider | Bonnes intentions hors-ligne (SQLite), mais erreurs silencieuses massives, tunnel USSD anxiogène sans persistance, et disparités de validation. |
| **Gestion des Erreurs & Modals** | **4.0 / 10** | 🔴 Insuffisant | Modals non centralisés, popups natifs `Alert.alert` sur les forfaits, absence de table de traduction des codes `AppError`, et zéro ErrorBoundary. |
| **NOTE GLOBALE ADMA** | **5.5 / 10** | ⚠️ Niveau MVP avancé | L'application est fonctionnelle en conditions idéales, mais devient fragile et frustrante dès que la connectivité faiblit ou qu'un incident survient. |

---

## 2. Tableau de notation détaillé

| Critère | Note / 10 | Justification synthétique |
|---|:---:|---|
| **Système de design & Palette** | **6.5 / 10** | Palette cohérente mais polices système génériques et redéfinition locale de tokens dans certains écrans ([plans.js](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L20-L31)). |
| **Contrastes & Accessibilité WCAG** | **4.0 / 10** | Le turquoise `#5FC2BA` sur blanc présente un ratio de 2.13:1 (échec AA) ; cibles tactiles souvent inférieures à 44×44 dp. |
| **Iconographie & Assets** | **7.0 / 10** | Lucide bien intégré, mais mélange incongru avec `@expo/vector-icons` dans [VerifiedBadge.js](file:///home/yokomi/adma-app/frontend/mobile/components/ui/VerifiedBadge.js#L1). |
| **Écran de démarrage & Splash** | **5.0 / 10** | Clignotement visible : masquage instantané du splash natif au profit d'un loader `Animated` avec fondu, affichant le logo deux fois. |
| **Responsive & Adaptabilité** | **6.5 / 10** | Bon usage des ScrollView/FlatList, mais calculs fixes basés sur `Dimensions.get('window')` sensibles aux polices agrandies. |
| **Animations & Transitions** | **6.5 / 10** | Mélange disparate entre `react-native-reanimated` v4 et l'ancien module `Animated` de React Native sans cohérence globale. |
| **Safe Area & Clavier** | **6.0 / 10** | `SafeAreaProvider` présent, mais `KeyboardAvoidingView` désactivé sur Android dans [login.js](file:///home/yokomi/adma-app/frontend/mobile/app/(auth)/login.js#L178) ou utilisant `height`. |
| **Cartes & Visualisation Forfaits** | **7.0 / 10** | Animation radar élégante sur les forfaits, mais le forfait Free est absent de la sélection et les tarifs sont désynchronisés. |
| **Parcours Onboarding & Connexion** | **6.5 / 10** | SVG soignés, auto-submit OTP bien verrouillé, mais regex téléphone trop restrictive (`6[4-9]` exclut Camtel 62X) et erreurs inline. |
| **Tunnel de Recherche & Fiches** | **7.0 / 10** | Recherche fluide et vue carte MapLibre performante, mais erreurs réseau silencieuses qui affichent des listes vides trompeuses. |
| **Attente & Clarté Paiement USSD** | **5.0 / 10** | Utilisateur mal guidé sur l'apparition du prompt SIM sur son téléphone ; arrêt irrémédiable du polling en cas de sortie d'écran. |
| **Navigation & Deep Linking** | **7.5 / 10** | Expo Router 6 bien configuré avec routes typées, protection `AuthGuard` réactive, mais deep links push mal mappés. |
| **Mode Hors-ligne & Réseau Lent** | **5.5 / 10** | SQLite fonctionnel sur l'accueil, mais `useNetworkStore` ignoré sur la recherche et les fiches ; timeout 20s inadapté à Render. |
| **Internationalisation (i18n)** | **7.5 / 10** | 565 clés en parité FR/EN/FUL remarquable, mais de nombreux textes système, alertes et erreurs restent codés en dur en français. |
| **Permissions Système (Android/iOS)** | **5.0 / 10** | Permissions obsolètes et dangereuses déclarées (`WRITE_EXTERNAL_STORAGE`), et modals de refus sans lien `Linking.openSettings`. |
| **Résilience & Gestion des Crashs** | **3.0 / 10** | Zéro ErrorBoundary, zéro écran de repli en cas d'erreur de rendu, et plus de 35 blocs catch muets avalant les exceptions. |

---

## 3. PARTIE 1 : Messages d'erreur & Modals (Priorité Maximale)

### 3.1 Inventaire exhaustif des `Alert.alert` et alertes natives

Le cahier des charges impose l'interdiction absolue des popups natifs (`Alert.alert`, `ToastAndroid`, `alert()`). L'inspection a identifié **3 occurrences résiduelles de `Alert.alert`**, toutes situées dans le module critique des abonnements et paiements :

| Fichier | Ligne | Code & Message Actuel | Gravité | Contexte & Impact Utilisateur |
|---|:---:|---|:---:|---|
| [payment.js](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L66-L70) | **66** | `Alert.alert('Changement programmé', res.data.message, [{ text: 'Compris', onPress: () => router.back() }])` | 🔴 **Critique** | **Downgrade programmé** : Popup système natif Android/iOS non stylisé, texte du bouton codé en dur en français, casse totale de l'immersion UI. |
| [plans.js](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L106-L127) | **106** | `Alert.alert('Annuler le changement', \`Voulez-vous annuler le passage au plan ${pendingChange?.newPlan} ?\`, [{ text: 'Non' }, { text: 'Oui, annuler', style: 'destructive', onPress: ... }])` | 🔴 **Critique** | **Confirmation d'annulation de forfait** : Popup système natif avec options bilingues impossibles, non conforme au design system Adma. |
| [plans.js](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L120) | **120** | `Alert.alert('Erreur', "Impossible d'annuler le changement.")` | 🔴 **Critique** | **Échec d'annulation** : Alerte native affichée en cas d'erreur API lors de la résiliation du downgrade. |

> [!CAUTION]
> Aucun `ToastAndroid` direct n'est présent dans le code source de l'application, mais l'utilisation de ces 3 `Alert.alert` natifs dans les écrans d'abonnement brise le contrat d'interface haut de gamme et empêche toute localisation en Fulfulde ou en Anglais.

---

### 3.2 Évaluation du composant modal existant : [`AppModal.js`](file:///home/yokomi/adma-app/frontend/mobile/components/ui/AppModal.js)

L'application dispose d'un embryon de modal personnalisé via [`AppModalProvider`](file:///home/yokomi/adma-app/frontend/mobile/components/ui/AppModal.js#L37) et la fonction impérative [`showAppModal`](file:///home/yokomi/adma-app/frontend/mobile/components/ui/AppModal.js#L96). Cependant, ce composant présente de sévères limitations ergonomiques et techniques :

1. **Architecture par variable globale instable** :
   ```javascript
   // components/ui/AppModal.js:6
   let setModalStateRef = null;
   ```
   L'état repose sur une variable de module. Si `showAppModal` est appelé avant que le layout ne soit totalement monté, le composant exécute aveuglément le callback `onConfirm` sans rien afficher ([L106-L109](file:///home/yokomi/adma-app/frontend/mobile/components/ui/AppModal.js#L106-L109)) !
2. **Absence d'empilement (Queue)** :
   Si deux erreurs surviennent en rafale (ex: erreur de géolocalisation suivie d'une perte réseau), le second appel écrase instantanément le premier sans que l'utilisateur n'ait pu lire le message.
3. **Animation native basique (Pas de Reanimated 4)** :
   Le composant utilise `<Modal transparent animationType="fade">` natif de React Native. Aucune animation d'entrée/sortie fluide (ressort, zoom, translation verticale avec `react-native-reanimated` v4).
4. **Collision avec le clavier virtuel** :
   Le modal ne comporte aucun `KeyboardAvoidingView` ni appel à `Keyboard.dismiss()`. Si le clavier virtuel est ouvert lors du déclenchement (ex: validation de formulaire dans [provider/create.js](file:///home/yokomi/adma-app/frontend/mobile/app/provider/create.js#L252)), le modal est tronqué ou positionné bizarrement derrière le clavier.
5. **Gestion défaillante du bouton retour Android** :
   La prop `onRequestClose={close}` ferme systématiquement le modal. Il est impossible de définir un modal bloquant / obligatoire (ex: session expirée ou mise à jour requise).
6. **Variantes trop restreintes** :
   Seulement 4 variantes génériques (`info`, `success`, `warning`, `danger`). Aucune variante spécialisée :
   - Pas de variante `network` avec bouton d'action « Réessayer » (retry).
   - Pas de variante `permission` avec redirection directe vers `Linking.openSettings()`.
   - Pas de variante `session` pour forcer la reconnexion avec déconnexion propre.
7. **Accessibilité inexistante** :
   Absence de `accessibilityRole="alertdialog"`, d'`accessibilityViewIsModal={true}` et de focus trap pour les lecteurs d'écran TalkBack / VoiceOver.

---

### 3.3 Traduction des erreurs du backend & Intercepteur Axios

L'examen du client HTTP [`services/api.js`](file:///home/yokomi/adma-app/frontend/mobile/services/api.js) et du middleware backend [`errorHandler.js`](file:///home/yokomi/adma-app/backend/server/src/middleware/errorHandler.js) met en lumière une fracture complète dans la chaîne de transmission des erreurs :

#### Le contrat du backend (`AppError`)
Le backend standardise parfaitement ses retours d'erreur sous la forme :
```json
{
  "success": false,
  "code": "OTP_EXPIRED",
  "message": "Code OTP expiré ou introuvable",
  "data": null
}
```

#### La rupture côté client ([`api.js`](file:///home/yokomi/adma-app/frontend/mobile/services/api.js#L40-L48))
L'intercepteur de réponse Axios procède comme suit :
```javascript
// services/api.js:46-48
} else {
  err.userMessage = err.response.data?.message || 'Une erreur est survenue.';
}
```
**Analyse des défauts constatés** :
- **Ignorance du `code` applicatif** : L'intercepteur extrait `message` (chaîne rédigée en français côté backend) et ignore totalement `code` (`err.response.data?.code`).
- **Aucune table de correspondance i18n** : L'application ne traduit jamais le code via `i18n.t(\`errors.${code}\`)`.
- **Régression multilingue immédiate** : Un utilisateur ayant configuré l'application en Anglais ou en Fulfulde verra s'afficher des messages d'erreur en Français (ex: *« Vous avez déjà laissé un avis »*, *« Compte introuvable ou suspendu »*).
- **Messages techniques en dur** : Les erreurs hors-ligne et timeout sont codées en dur en français dans `api.js` ([L42-L44](file:///home/yokomi/adma-app/frontend/mobile/services/api.js#L42-L44)) sans passer par `t()`.
- **Désynchronisation critique du store d'authentification sur échec de refresh token** :
  Dans [api.js:83-88](file:///home/yokomi/adma-app/frontend/mobile/services/api.js#L83-L88), lorsque le refresh token échoue, les clés sont supprimées de `SecureStore`, mais **le store Zustand `useAuthStore` n'est jamais notifié** (`useAuthStore.getState().logout()` n'est pas appelé). L'application continue de croire que l'utilisateur est connecté (`isLoggedIn: true`) jusqu'au prochain redémarrage forcé !
- **Démarrage à froid Render (Cold Start)** :
  Le timeout d'Axios est fixé à **20 secondes** ([api.js:14](file:///home/yokomi/adma-app/frontend/mobile/services/api.js#L14)). Or, un conteneur Render gratuit en veille met fréquemment entre **30 et 50 secondes** à démarrer. Au bout de 20s, la requête est avortée avec `ECONNABORTED`, et l'utilisateur reçoit : *« Le délai d’attente a expiré. Veuillez vérifier votre connexion »*, ce qui le trompe en lui faisant croire que son propre réseau est défaillant !

---

### 3.4 Matrice exhaustive des erreurs par scénario

| Scénario d'erreur | Code API Backend | Affichage Actuel | Message Actuel | Traduit FR/EN/FUL ? | Action corrective requise |
|---|---|:---:|---|:---:|---|
| **Numéro de téléphone invalide** | `INVALID_PHONE` | Texte rouge inline ([login.js:102](file:///home/yokomi/adma-app/frontend/mobile/app/(auth)/login.js#L102)) | `t('auth.invalidPhone')` | ✅ Oui | Modal ou helper visuel inline avec format attendu (+237 6XX...). |
| **Code OTP incorrect** | `OTP_INVALID` | Texte rouge inline ([login.js:140](file:///home/yokomi/adma-app/frontend/mobile/app/(auth)/login.js#L140)) | Message serveur brut | ❌ Non (FR seul) | Traduire via code `errors.OTP_INVALID`. Secouer le champ (shake animation). |
| **Code OTP expiré** | `OTP_EXPIRED` | Texte rouge inline ([login.js:146](file:///home/yokomi/adma-app/frontend/mobile/app/(auth)/login.js#L146)) | Message serveur brut | ❌ Non (FR seul) | Modal dédié avec bouton d'action direct « Renvoyer un code ». |
| **Quota tentatives OTP dépassé** | `OTP_MAX_ATTEMPTS` | Texte rouge inline ([login.js:146](file:///home/yokomi/adma-app/frontend/mobile/app/(auth)/login.js#L146)) | Message serveur brut | ❌ Non (FR seul) | Modal d'avertissement bloquant avec compte à rebours de 10 min. |
| **Réseau hors-ligne (NetInfo)** | `NETWORK_ERROR` | Bannière accueil seule ([index.js:155](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/index.js#L155)) ; **Rien ailleurs** | `t('home.noConnection')` | ⚠️ Accueil seul | Modal / Bannière globale non intrusive avec détection automatique du rétablissement. |
| **Timeout serveur (Render en démarrage)** | `ECONNABORTED` | Texte inline ou rien selon écran | En dur dans `api.js:42` | ❌ Non (FR seul) | Timeout à 45s + Modal rassurant « Le serveur se réveille, veuillez patienter » + retry. |
| **Erreur serveur interne (500)** | `INTERNAL_ERROR` | `showAppModal` ou inline ou rien | `err.response.data?.message` | ❌ Non (FR seul) | Modal d'erreur serveur convivial avec illustration et bouton « Réessayer ». |
| **Opérateur paiement non choisi** | Client-side | Texte rouge inline ([payment.js:48](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L48)) | `t('payment.error.operator')` | ✅ Oui | Mettre en surbrillance les cartes opérateurs avec vibration haptique. |
| **Numéro paiement invalide** | Client-side | Texte rouge inline ([payment.js:49](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L49)) | `t('payment.error.phone')` | ✅ Oui | Harmoniser la regex avec l'authentification (accepter toutes les plages 64X-69X). |
| **Échec / Annulation paiement** | `PAYMENT_FAILED` | Texte rouge inline ([payment.js:147](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L147)) | `t('payment.error.failed')` | ✅ Oui | Modal d'échec de paiement avec motifs possibles (solde insuffisant, rejet USSD) et bouton réessai. |
| **Timeout confirmation USSD (90s)** | Client-side | Texte rouge inline ([payment.js:123](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L123)) | En dur dans payment.js | ❌ Non (FR seul) | Modal avec choix : « Continuer à vérifier » ou « Vérifier plus tard sur mon profil ». |
| **Lien de paiement expiré** | `PAYMENT_EXPIRED` | Texte rouge inline ([payment.js:80](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L80)) | En dur dans payment.js | ❌ Non (FR seul) | Modal invitant à régénérer une transaction. |
| **Rate limit paiement (5 tent./10min)** | `RATE_LIMIT_EXCEEDED`| Texte rouge inline ([payment.js:105](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L105)) | Message backend brut | ❌ Non (FR seul) | Modal d'avertissement avec timer avant prochaine tentative autorisée. |
| **Downgrade plan programmé (202)** | `PLAN_DOWNGRADE_SCHEDULED` | **Alert.alert natif** ([payment.js:66](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L66)) | Message backend brut | ❌ Non (FR seul) | Remplacer par `AdmaModal` variante info/calendrier avec date d'effet traduite. |
| **Annulation downgrade programmé** | Action client | **Alert.alert natif** ([plans.js:106](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L106)) | En dur dans plans.js | ❌ Non (FR seul) | Remplacer par `AdmaModal` confirmation destructif. |
| **Échec annulation downgrade** | Erreur API | **Alert.alert natif** ([plans.js:120](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L120)) | En dur dans plans.js | ❌ Non (FR seul) | Remplacer par `AdmaModal` danger avec message traduit. |
| **Fichier upload trop lourd (> 5Mo)** | `LIMIT_FILE_SIZE` | `showAppModal` ([create.js:252](file:///home/yokomi/adma-app/frontend/mobile/app/provider/create.js#L252)) | Message Multer brut FR | ❌ Non (FR seul) | Compression d'image avant upload + modal traduit `errors.LIMIT_FILE_SIZE`. |
| **Photo CNI recto manquante** | Validation client | `showAppModal` ([verification:107](file:///home/yokomi/adma-app/frontend/mobile/app/verification/index.js#L107))| Titre 'Information' en dur | ⚠️ Partiel | Utiliser `t('common.info')` et variante warning. |
| **Permission Caméra/Galerie refusée** | Statut système | `showAppModal` ([verification:43](file:///home/yokomi/adma-app/frontend/mobile/app/verification/index.js#L43)) | Titre 'Permission requise' en dur | ❌ Non (FR seul) | Modal avec bouton « Ouvrir les paramètres » (`Linking.openSettings()`). |
| **Permission GPS refusée (Recherche)** | Statut système | Bannière dans [search.js:26](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/search.js#L26) | Traduit via clés i18n | ✅ Oui | Bien géré avec `Linking.openSettings()`. À harmoniser sur toute l'app. |
| **Permission GPS refusée (Fiche pro)** | Statut système | `showAppModal` ([create.js:158](file:///home/yokomi/adma-app/frontend/mobile/app/provider/create.js#L158)) | Titre/Message traduits | ⚠️ Pas d'action | Ajouter le bouton « Ouvrir les paramètres ». |
| **Échec tuiles de carte (MapLibre)** | Réseau / Tuiles | **Rien (écran noir/blanc)** ([map.js:140](file:///home/yokomi/adma-app/frontend/mobile/app/map.js#L140))| Aucun | ❌ Rien | Écouter `onDidFailLoadingMap` et afficher un modal d'indisponibilité cartographique. |
| **Session expirée (Refresh token KO)** | `TOKEN_EXPIRED` | **Rien (store désynchronisé)** ([api.js:83](file:///home/yokomi/adma-app/frontend/mobile/services/api.js#L83))| Aucun | ❌ Rien | Réinitialiser `useAuthStore` et ouvrir le modal « Session expirée » avec redirection login. |
| **Compte suspendu** | `ACCOUNT_SUSPENDED`| Message serveur brut | Message backend | ❌ Non (FR seul) | Modal bloquant avec bouton d'appel au support. |
| **Avis déjà posté** | `ALREADY_REVIEWED` | `showAppModal` ([provider:287](file:///home/yokomi/adma-app/frontend/mobile/app/provider/[id].js#L287))| Message backend brut | ❌ Non (FR seul) | Traduire via `errors.ALREADY_REVIEWED`. Proposer d'éditer l'avis existant. |
| **Fiche prestataire déjà créée** | `DUPLICATE` | `showAppModal` ([create.js:252](file:///home/yokomi/adma-app/frontend/mobile/app/provider/create.js#L252)) | Message backend brut | ❌ Non (FR seul) | Traduire via `errors.DUPLICATE`. Rediriger vers l'édition. |

---

### 3.5 Analyse des blocs `catch` silencieux et promesses ignorées

L'audit révèle **38 blocs de capture d'erreur muets** (`catch {}`, `catch (e) {}` ou `.catch(() => {})`) à travers le code mobile. Les plus graves sont :

1. [frontend/mobile/app/(tabs)/search.js:317 & 346](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/search.js#L317) :
   ```javascript
   } catch { if (reset) setProviders([]); }
   ```
   En cas de déconnexion réseau, de timeout Render ou d'erreur 500 pendant la recherche, le code vide la liste des résultats sans informer l'utilisateur. Ce dernier conclut faussement qu'aucun prestataire n'existe à Ngaoundéré pour son métier !
2. [frontend/mobile/app/(tabs)/profile.js:131-133](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/profile.js#L131-L133) :
   ```javascript
   } catch {
     setLocalProvider(null);
   }
   ```
   Si l'appel `/providers/me` échoue pour cause de réseau instable, le profil décrète que l'utilisateur n'a pas de fiche et lui affiche le bandeau « Devenir prestataire » ! S'il clique dessus, il tente de recréer une fiche qui sera rejetée par le backend avec une erreur 409 `DUPLICATE`.
3. [frontend/mobile/app/(tabs)/favorites.js:30](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/favorites.js#L30) :
   ```javascript
   } catch {}
   ```
   L'échec de récupération des favoris affiche l'état vide « Vous n'avez pas encore de favoris », masquant une coupure réseau.
4. [frontend/mobile/app/map.js:61](file:///home/yokomi/adma-app/frontend/mobile/app/map.js#L61) :
   ```javascript
   } catch { setProviders([]); }
   ```
   La carte s'affiche vide sans aucun marqueur ni notification d'échec de chargement.
5. [frontend/mobile/app/provider/[id].js:518 & 520](file:///home/yokomi/adma-app/frontend/mobile/app/provider/[id].js#L518) :
   ```javascript
   Linking.openURL(`https://wa.me/${international}`).catch(() => {});
   Linking.openURL(`tel:${phone.replace(/\D/g, '')}`).catch(() => {});
   ```
   Si WhatsApp n'est pas installé sur l'appareil ou si l'intent d'appel téléphonique échoue, l'action est silencieuse. L'utilisateur clique et rien ne se passe.

---

### 3.6 Absence de gestionnaire centralisé et d'ErrorBoundary global

- **Aucun ErrorBoundary React** : Aucun fichier `ErrorBoundary.jsx` n'est implémenté ni exporté depuis [app/_layout.js](file:///home/yokomi/adma-app/frontend/mobile/app/_layout.js) ou un fichier `+error.js` (convention Expo Router). Une simple exception JavaScript non capturée dans un rendu provoque un crash brutal de l'application vers l'écran d'accueil d'Android.
- **Dispersion de la logique des modals** : Chaque écran importe `showAppModal` et redéfinit ses propres textes de titre, de boutons et de messages, sans garantie d'unicité, sans file d'attente et sans typage strict.

---

## 4. PARTIE 2 : Audit de l'Interface Utilisateur (UI)

### 4.1 Cohérence visuelle, design system et respect de la palette (Note : 6.5 / 10)
- **Palette officielle** : Définie dans [constants/colors.js](file:///home/yokomi/adma-app/frontend/mobile/constants/colors.js) (`#0B162C`, `#1C2942`, `#3B556D`, `#5FC2BA`, `#FFFFFF`).
- **Anomalie de duplication** : L'écran des forfaits [subscription/plans.js:20-31](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L20-L31) ignore complètement `constants/colors.js` et recrée son propre objet local `COLORS = { bg: '#FAFBFC', dark: '#0B162C', ... }`.
- **Typographie** : Bien que la documentation projet mentionne *Plus Jakarta Sans*, aucune police personnalisée n'est chargée via `expo-font` dans `_layout.js`. L'application utilise la police système par défaut (`Roboto` sur Android, `San Francisco` sur iOS).

### 4.2 Contrastes et conformité WCAG AA (Note : 4.0 / 10)

> [!WARNING]
> **Problème d'accessibilité majeur (Échec WCAG AA)**  
> La couleur d'accent `#5FC2BA` (luminance relative = 0.442) appliquée sur fond blanc `#FFFFFF` (luminance = 1.0) donne un **ratio de contraste de 2.13:1**.  
> Le standard WCAG AA impose un ratio minimal de **4.5:1** pour le texte normal et de **3.0:1** pour les éléments graphiques et grands textes.  
> 
> **Conséquence directe** : En plein soleil à Ngaoundéré, les textes écrits en `#5FC2BA` sur fond blanc sont **quasiment invisibles** pour un œil normal et illisibles pour un utilisateur malvoyant.

Emplacements critiques identifiés :
- [Button.js:6](file:///home/yokomi/adma-app/frontend/mobile/components/ui/Button.js#L6) : Variante `secondary` (`text: colors.primary` sur fond blanc).
- [Button.js:8](file:///home/yokomi/adma-app/frontend/mobile/components/ui/Button.js#L8) : Variante `ghost` (`text: colors.primary` sur fond transparent/blanc).
- [Button.js:5](file:///home/yokomi/adma-app/frontend/mobile/components/ui/Button.js#L5) : Variante `primary` : Texte blanc `#FFFFFF` sur fond `#5FC2BA` = **même ratio illégal de 2.13:1** !
- [index.js:239](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/index.js#L239) : Label de localisation « Ngaoundéré, Adamaoua » sous le bonjour.
- [index.js:285](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/index.js#L285) : Bouton « Voir tout » des catégories.
- [search.js:508](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/search.js#L508) : Texte du badge de recherche « Autour de moi ».

### 4.3 Iconographie & Cohérence des composants graphiques (Note : 7.0 / 10)
- La librairie moderne `lucide-react-native` est bien adoptée pour 95% des icônes de l'application.
- **Rupture d'uniformité** : Le composant clé [VerifiedBadge.js:1](file:///home/yokomi/adma-app/frontend/mobile/components/ui/VerifiedBadge.js#L1) importe `MaterialIcons` depuis `@expo/vector-icons` au lieu d'utiliser `BadgeCheck` ou `ShieldCheck` de Lucide. De plus, il injecte des couleurs hors-palette : `#1D9BF0` (bleu Twitter) et `#FFD400` (jaune canari vif).

### 4.4 Écran de démarrage : Problème du double logo (Note : 5.0 / 10)
Le flux de lancement dans [app/_layout.js](file:///home/yokomi/adma-app/frontend/mobile/app/_layout.js) et [LoadingScreen.js](file:///home/yokomi/adma-app/frontend/mobile/components/ui/LoadingScreen.js) présente un défaut de conception visible :
```javascript
// app/_layout.js:22
SplashScreen.preventAutoHideAsync().catch(() => {});
...
// app/_layout.js:54
SplashScreen.hideAsync().catch(() => {}); // Masqué dès le montage !
...
// app/_layout.js:82
if (!ready) return <LoadingScreen />;
```
Dans [LoadingScreen.js:11-15](file:///home/yokomi/adma-app/frontend/mobile/components/ui/LoadingScreen.js#L11-L15), une animation `Animated.timing` fait passer l'opacité du logo de `0` à `1` en 400ms.  
**Effet perçu par l'utilisateur** : L'OS affiche le splash natif avec le logo Adma. Immédiatement, le splash natif disparaît, le logo s'efface, puis réapparaît en fondu avec un spinner en dessous. Le logo s'affiche donc **deux fois**, créant un clignotement désagréable.

### 4.5 Responsive & Font Scaling (Note : 6.5 / 10)
- L'écran [subscription/plans.js:37](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L37) calcule la largeur de chaque segment par formule rigide : `const SEGMENT_WIDTH = (width - 48 - 8) / 3;`. Si l'utilisateur active la taille de police maximale dans les paramètres d'accessibilité Android, le texte des onglets déborde et se chevauche.
- Dans [ProviderCard.js:136](file:///home/yokomi/adma-app/frontend/mobile/components/cards/ProviderCard.js#L136), l'image avatar est fixée à `78×78 dp`. Sur les écrans de faible résolution (ex: 360dp de large, très courants sur les smartphones d'entrée de gamme à Ngaoundéré type Tecno, Itel), le contenu textuel central est fortement écrasé.

### 4.6 Animations & Transitions Reanimated 4 (Note : 6.5 / 10)
- Le projet intègre `react-native-reanimated` v4.1.1. Les animations radar et slider de forfaits dans `plans.js` exploitent correctement `useSharedValue`, `useAnimatedStyle` et `withSpring`.
- En revanche, [LoadingScreen.js:6](file:///home/yokomi/adma-app/frontend/mobile/components/ui/LoadingScreen.js#L6), [login.js:35](file:///home/yokomi/adma-app/frontend/mobile/app/(auth)/login.js#L35) et [onboarding/index.js:9](file:///home/yokomi/adma-app/frontend/mobile/app/onboarding/index.js#L9) continuent d'utiliser l'ancienne API `Animated` de React Native avec des interpolations manuelles, alourdissant le thread JS au lieu d'exécuter sur le thread UI via les worklets.

### 4.7 Safe Area, Clavier et Edge-to-Edge (SDK 54) (Note : 6.0 / 10)
- **Expo SDK 54 Edge-to-Edge** : L'activation d'Edge-to-edge par défaut sous Android avec SDK 54 nécessite une gestion rigoureuse de la barre de navigation inférieure. Dans plusieurs formulaires modaux ([reviews/[id].js](file:///home/yokomi/adma-app/frontend/mobile/app/reviews/[id].js#L82), [report.js](file:///home/yokomi/adma-app/frontend/mobile/app/report.js#L75)), le padding inférieur n'intègre pas `insets.bottom`, plaçant le bouton d'action au ras de la barre de navigation Android.
- **Gestion du clavier** : Dans [login.js:178](file:///home/yokomi/adma-app/frontend/mobile/app/(auth)/login.js#L178), `KeyboardAvoidingView` possède `enabled={Platform.OS === 'ios'}`. Sur Android, le champ de saisie de l'OTP est partiellement masqué par le clavier lors de son apparition sur les écrans de hauteur inférieure à 700dp.

### 4.8 Cartes, Badges et Affichage des Prix de Fidélité (Note : 7.0 / 10)
- La carte MapLibre avec le style Positron d'OpenFreeMap s'affiche avec clarté, et le clustering fonctionne efficacement.
- **Incohérence majeure de la grille tarifaire** :
  Le fichier [constants/config.js:4-9](file:///home/yokomi/adma-app/frontend/mobile/constants/config.js#L4-L9) déclare :
  ```javascript
  premium: { price: 1000 }, professional: { price: 2500 }, enterprise: { price: 5000 }
  ```
  Alors que le backend applique strictement la tarification documentée au README :
  ```javascript
  premium: [1300, 1100, 850], professional: [3900, 3200, 2500], enterprise: [7500, 6200, 4900]
  ```
  Le plan **Free** (3 km de rayon) est complètement ignoré dans le sélecteur des forfaits, interdisant à un prestataire de rétrograder volontairement vers la formule gratuite.

---

## 5. PARTIE 3 : Audit de l'Expérience Utilisateur (UX)

### 5.1 Parcours clés & Frictions (Note : 6.0 / 10)

```
[Parcours Inscription]  ── Saisie Tél (+237) ──► Réception SMS ──► Saisie OTP (6 chiffres) ──► Redirection Tabs
                              │                      │                     │
                              ▼                      ▼                     ▼
                       Format 6[4-9]          Délai 60s bloquant     Erreur inline
                      (exclut Camtel)       (pas d'aide alternative)  (pas de modal)

[Parcours Paiement]     ── Choix Plan ──► Choix Opérateur (OM/MoMo) ──► Saisie Numéro ──► WebBrowser / USSD ──► Polling (max 90s)
                                                                                              │                 │
                                                                                              ▼                 ▼
                                                                                         Pas d'alerte    Arrêt immédiat si
                                                                                          prompt SIM     sortie de l'écran
```

- **Friction OTP** : En cas de non-réception du SMS (fréquent avec les passerelles SMS au Cameroun selon l'encombrement réseau), l'utilisateur n'a d'autre choix que d'attendre 60 secondes. Aucun lien d'assistance vers WhatsApp ou support direct n'est proposé.
- **Friction Formulaire de création** : La création de fiche prestataire s'effectue en 4 étapes séquentielles. Si l'application est fermée ou redémarrée au milieu du processus, toutes les données saisies sont perdues car aucun brouillon local n'est sauvegardé dans AsyncStorage/SQLite.

### 5.2 Attente du paiement USSD & Cycle de vie de la transaction (Note : 5.0 / 10)
- **Confusion sur le prompt USSD** : Le composant [payment.js:198](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L198) affiche : *« Suivez les instructions sur la page de paiement »*. Or, pour Orange Money et MTN MoMo au Cameroun, l'utilisateur reçoit souvent une notification push USSD système directe sur sa carte SIM (demandant la saisie de son code secret PIN). S'il a ouvert le WebBrowser, ce dernier passe au premier plan et cache la popup USSD !
- **Perte irrémédiable de la session de paiement** :
  Dans [payment.js:40-43](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L40-L43), lorsque le composant se démonte (retour arrière ou bascule d'écran), le timer est tué : `stoppedRef.current = true; clearTimeout(pollRef.current);`. Si l'utilisateur quitte l'écran pour consulter son SMS de confirmation de débit bancaire, l'application cesse de sonder le serveur et ne valide jamais l'abonnement sur l'appareil.

### 5.3 Navigation Expo Router & Deep Linking (Note : 7.5 / 10)
- La navigation par onglets `(tabs)` et la gestion de la pile `Stack` sont propres et fluides.
- **Problème de Deep Linking sur les notifications** :
  Dans [services/notifications.js:40-48](file:///home/yokomi/adma-app/frontend/mobile/services/notifications.js#L40-L48), le router traite des liens sous la forme `/provider/${data.providerId}`. Cependant, la notification n'est pas persistée si l'app était tuée à froid, menant parfois à l'écran d'accueil par défaut sans redirection.

### 5.4 Mode hors-ligne & Cache SQLite (Note : 5.5 / 10)
- **Point fort** : [services/cache.js](file:///home/yokomi/adma-app/frontend/mobile/services/cache.js) implémente un cache SQLite avec base relationnelle `adma.db` et gestion d'expiration par TTL.
- **Point faible** : Ce cache n'est exploité que par l'accueil et le détail d'un prestataire. L'écran de recherche, les avis et les favoris n'en bénéficient pas. Si le réseau coupe lors d'une recherche, l'utilisateur voit une page blanche sans indication de reprise hors-ligne.

### 5.5 Accessibilité (Note : 4.5 / 10)
- Les cibles tactiles sont fréquemment inférieures à la recommandation minimale de **44×44 dp** :
  - Bouton retour dans [plans.js:303](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L303) : `40×40 dp`.
  - Bouton d'activation dans [search.js:55](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/search.js#L55) : padding 12×6 dp (~28 dp de hauteur).
  - Icône de filtre chips : zone de tap étroite.
- Rares sont les éléments dotés de propriétés `accessibilityLabel` ou `accessibilityHint`. Les personnes utilisant des lecteurs d'écran entendent des libellés muets sur les boutons d'icônes seuls (ex: cloche de notification, géolocalisation).

### 5.6 Internationalisation & Fulfulde (Note : 7.5 / 10)
- **Le tour de force** : 565 clés complètes en Fulfulde dans [ful.json](file:///home/yokomi/adma-app/frontend/mobile/i18n/ful.json). Le patch sur `Intl.PluralRules` dans [i18n/index.js:27-43](file:///home/yokomi/adma-app/frontend/mobile/i18n/index.js#L27-L43) redirigeant le code non standard `ful` vers `ff` est une excellente trouvaille technique.
- **Textes en dur résiduels** : Plusieurs dizaines de textes restent codés en dur en français dans les fichiers source :
  - [plans.js:181-198](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L181-L198) : *« Changement programmé »*, *« Passage au plan »*, *« Annuler le changement »*.
  - [payment.js:53, 80, 91, 102, 124](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L53) : Tous les statuts et alertes de paiement sont en français brut.
  - [support.js:48-49](file:///home/yokomi/adma-app/frontend/mobile/app/settings/support.js#L48-L49) : Clés dupliquées menant à un contenu erroné.

### 5.7 Performance perçue & Gestion des listes (Note : 7.0 / 10)
- La `FlatList` est correctement mise en œuvre dans la recherche et les notifications avec `keyExtractor`, `onEndReached` et `ListEmptyComponent`.
- En revanche, dans l'accueil [index.js:208](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/index.js#L208), la liste des prestataires recommandés est rendue par un simple `providers.map(...)` au sein d'un `ScrollView`. Si le backend renvoie une trentaine de prestataires, l'accueil subit des chutes de framerate lors du scroll sur les terminaux Android à processeur modeste (MediaTek Helio / Unisoc).

### 5.8 Permissions Android obsolètes & Incohérences `app.json` (Note : 5.0 / 10)
L'inspection du manifeste [app.json:37-46](file:///home/yokomi/adma-app/frontend/mobile/app.json#L37-L46) révèle des déclarations obsolètes et problématiques :
```json
"permissions": [
  "CAMERA",
  "READ_EXTERNAL_STORAGE",
  "WRITE_EXTERNAL_STORAGE",
  "INTERNET",
  "VIBRATE",
  "RECEIVE_BOOT_COMPLETED",
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION"
]
```
1. **`READ_EXTERNAL_STORAGE` et `WRITE_EXTERNAL_STORAGE`** : Dépréciées depuis Android 10 et formellement interdites/bloquées par Google Play sur Android 13+ (API 33+) pour les applications qui ne sont pas des gestionnaires de fichiers. `expo-image-picker` gère les photos via le sélecteur système sans nécessiter ces permissions invasives.
2. **`RECEIVE_BOOT_COMPLETED`** : Déclarée sans aucun composant récepteur de démarrage (BootReceiver) dans le code JavaScript, ce qui suscite une suspicion inutile lors des vérifications de sécurité du Play Store.
3. **Discordance des motifs de permission** :
   - iOS Plist caméra : *« Adma utilise votre caméra pour prendre une photo de profil »* ([app.json:23](file:///home/yokomi/adma-app/frontend/mobile/app.json#L23)).
   - Plugin image picker caméra : *« Adma utilise votre caméra »* ([app.json:86](file:///home/yokomi/adma-app/frontend/mobile/app.json#L86)).

---

## 6. PARTIE 4 : Santé Technique Liée à l'UX

### 6.1 Dépendances dans [`package.json`](file:///home/yokomi/adma-app/frontend/mobile/package.json)
1. **Conflit de librairies de worklets** :
   ```json
   "react-native-worklets": "0.5.1",
   "react-native-worklets-core": "^1.6.3",
   ```
   Présence simultanée de `react-native-worklets` et de `react-native-worklets-core`. Reanimated 4 exploite désormais sa propre architecture de worklets. La cohabitation de ces deux paquets tiers distincts risque d'engendrer des conflits de symboles natifs (`duplicate class / symbols`) lors des builds de production EAS.
2. **Dépendances superflues pour une application 100% mobile** :
   ```json
   "react-dom": "19.1.0",
   "react-native-web": "^0.21.0",
   ```
   Adma mobile est exclusivement déployée sur iOS et Android (EAS build APK). La présence de `react-dom` et `react-native-web` alourdit inutilement le graphe de dépendances et la résolution de modules Metro.

### 6.2 Fichiers de configuration EAS et assets
- Dans [app.json:59](file:///home/yokomi/adma-app/frontend/mobile/app.json#L59), le splash screen cible `./assets/icon.png` au lieu du fichier dédié `./assets/splash.png` présent dans le répertoire.
- Dans [eas.json:11-16](file:///home/yokomi/adma-app/frontend/mobile/eas.json#L11-L16), le profil `preview` compile un APK direct (`"buildType": "apk"`), ce qui est optimal pour tester sur les téléphones locaux au Cameroun sans passer par le Play Store.

---

## 7. Synthèse des Problèmes Classés par Gravité

### 🔴 Problèmes Critiques (P0 - À corriger immédiatement)

1. **Présence d'`Alert.alert` natifs dans les parcours d'abonnement**
   - **Emplacement** : [subscription/payment.js:66](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L66), [subscription/plans.js:106, 120](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L106)
   - **Impact** : Casse de l'expérience utilisateur, impossibilité de traduire les alertes en Fulfulde/Anglais, violation stricte du cahier des charges.
   - **Solution** : Remplacer par le composant centralisé `AdmaModal`.

2. **Défaut de contraste WCAG AA sur la couleur principale `#5FC2BA`**
   - **Emplacement** : [constants/colors.js:7](file:///home/yokomi/adma-app/frontend/mobile/constants/colors.js#L7), [Button.js:5-8](file:///home/yokomi/adma-app/frontend/mobile/components/ui/Button.js#L5)
   - **Impact** : Ratio de contraste 2.13:1 sur fond blanc. Illisible en extérieur pour la majorité des utilisateurs.
   - **Solution** : Remplacer le turquoise clair par un teal sombre conforme WCAG AA pour les textes et boutons (`#167C74`, ratio 4.6:1), ou ajouter une couleur dédiée `primaryText: '#136B64'`.

3. **Absence d'ErrorBoundary global et d'écran de secours**
   - **Emplacement** : [app/_layout.js](file:///home/yokomi/adma-app/frontend/mobile/app/_layout.js)
   - **Impact** : Tout incident de rendu React provoque le crash immédiat de l'application.
   - **Solution** : Implémenter et exporter un composant `ErrorBoundary` à la racine de l'application avec option de rechargement.

4. **Désynchronisation de session sur échec de refresh token**
   - **Emplacement** : [services/api.js:83-88](file:///home/yokomi/adma-app/frontend/mobile/services/api.js#L83-L88)
   - **Impact** : Les tokens sont supprimés de SecureStore mais le store `useAuthStore` conserve `isLoggedIn: true`. L'utilisateur reste bloqué dans une interface non authentifiée où chaque requête échoue en boucle.
   - **Solution** : Invoquer `useAuthStore.getState().logout()` dans l'intercepteur et afficher le modal de session expirée.

5. **Erreurs silencieuses dans la recherche et le profil prestataire**
   - **Emplacement** : [app/(tabs)/search.js:317](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/search.js#L317), [app/(tabs)/profile.js:131](file:///home/yokomi/adma-app/frontend/mobile/app/(tabs)/profile.js#L131)
   - **Impact** : L'utilisateur pense qu'il n'y a aucun prestataire à proximité ou qu'il a perdu sa fiche professionnelle lors d'une simple micro-coupure réseau.
   - **Solution** : Différencier l'état d'erreur de l'état vide et proposer un bouton d'action « Réessayer ».

---

### 🟠 Problèmes Majeurs (P1 - Priorité Haute)

1. **Perte de transaction en cas de sortie de l'écran de paiement USSD**
   - **Emplacement** : [subscription/payment.js:40-43](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/payment.js#L40-L43)
   - **Impact** : L'utilisateur qui consulte son SMS ou son solde perd le suivi de sa transaction.
   - **Solution** : Sauvegarder l'ID de transaction en cours dans SQLite/AsyncStorage et proposer une reprise de vérification sur l'écran profil/abonnement.

2. **Démarrage à froid Render (Cold Start) mal géré**
   - **Emplacement** : [services/api.js:14](file:///home/yokomi/adma-app/frontend/mobile/services/api.js#L14), [LoadingScreen.js:18](file:///home/yokomi/adma-app/frontend/mobile/components/ui/LoadingScreen.js#L18)
   - **Impact** : Timeout de 20s trop agressif, générant un faux message d'erreur de connexion utilisateur.
   - **Solution** : Porter le timeout initial à 45s avec message explicite sur le réveil du serveur.

3. **Incohérence de la grille tarifaire client vs backend**
   - **Emplacement** : [constants/config.js:4-9](file:///home/yokomi/adma-app/frontend/mobile/constants/config.js#L4-L9), [subscription/plans.js:33](file:///home/yokomi/adma-app/frontend/mobile/app/subscription/plans.js#L33)
   - **Impact** : Tarifs statiques obsolètes affichés au client, absence du plan Free dans la gestion des forfaits.
   - **Solution** : Supprimer les tarifs statiques de `config.js` et s'appuyer exclusivement sur le point d'API dynamique `/providers/me/pricing`.

4. **Questions FAQ dupliquées dans l'écran de support**
   - **Emplacement** : [app/settings/support.js:48-49](file:///home/yokomi/adma-app/frontend/mobile/app/settings/support.js#L48-L49)
   - **Impact** : Deux entrées de FAQ affichent des questions et réponses erronées (copie de la création de compte).
   - **Solution** : Créer les clés `support.faqs.reviewsQ/A` et `support.faqs.reportQ/A` dans les fichiers de traduction.

5. **Permissions Android obsolètes**
   - **Emplacement** : [app.json:39-43](file:///home/yokomi/adma-app/frontend/mobile/app.json#L39-L43)
   - **Impact** : Risque de blocage Google Play pour `WRITE_EXTERNAL_STORAGE` et `RECEIVE_BOOT_COMPLETED`.
   - **Solution** : Retirer ces permissions obsolètes du manifeste Android.

---

### 🟡 Problèmes Mineurs (P2 - Confort et Finition)

1. **Double affichage du logo au lancement** : Masquage trop précoce du splash screen natif dans [app/_layout.js:54](file:///home/yokomi/adma-app/frontend/mobile/app/_layout.js#L54).
2. **Non-harmonisation de la validation téléphonique** : Regex `6[4-9]` dans login vs `6[5-9]` dans payment.
3. **Absence de bouton « Paramètres » sur refus de permission photo/caméra** : Modal sans redirection dans [verification/index.js:43](file:///home/yokomi/adma-app/frontend/mobile/app/verification/index.js#L43).
4. **Mélange de librairies d'icônes** : Utilisation isolée de `MaterialIcons` dans [VerifiedBadge.js](file:///home/yokomi/adma-app/frontend/mobile/components/ui/VerifiedBadge.js).
5. **Cibles tactiles < 44 dp** sur plusieurs boutons secondaires.

---

### 🔵 Suggestions d'Amélioration (P3)

1. **Suppression des dépendances superflues** : Nettoyer `react-dom` et `react-native-web` de `package.json`.
2. **Nettoyage des worklets** : Désinstaller `react-native-worklets-core` pour ne conserver que la solution officielle Reanimated 4.
3. **Compression d'image côté client** : Redimensionner et compresser automatiquement les photos de profil et CNI avant upload pour réduire la consommation de données mobiles des utilisateurs camerounais.

---

## 8. Points Forts à Conserver

1. **Qualité et profondeur de l'internationalisation** : Parité remarquable de 565 clés en Français, Anglais et Fulfulde, avec détection automatique de la langue locale du téléphone.
2. **Architecture de cache SQLite intelligente** : Présence de `expo-sqlite` avec table dédiée, gestion des délais d'expiration par TTL, et politique de rafraîchissement propre.
3. **Cartographie légère et libre** : Intégration efficace d'OpenFreeMap et de MapLibre v10 avec clustering vectoriel et restrictions de déplacement (snap-back) sur les frontières de l'Adamaoua et du Cameroun.
4. **Tunnel de connexion OTP sans friction** : Auto-submit fluide à 6 chiffres avec verrou anti-double-requête (`isVerifyingRef`), évitant les blocages d'appels concurrents.
5. **Identité visuelle de marque** : Association harmonieuse du bleu nuit (`#0B162C`) et des tons pastel, reflétant une identité professionnelle et locale crédible.

---

## 9. Plan d'Action Priorisé

| Phase | Chantier / Action | Fichiers concernés | Effort | Impact UX |
|---|---|---|:---:|:---:|
| **1. Quick Wins (Jour 1)** | Remplacer les 3 `Alert.alert` par des modals personnalisés | `subscription/payment.js`, `subscription/plans.js` | Faible | 🔴 Critique |
| | Corriger le contraste du texte turquoise (#5FC2BA ➔ `#167C74`) | `constants/colors.js`, `Button.js` | Faible | 🔴 Critique |
| | Supprimer les permissions obsolètes (`WRITE_EXTERNAL_STORAGE`) | `app.json` | Faible | 🟠 Majeur |
| | Corriger les doublons de la FAQ Support | `settings/support.js`, `i18n/*.json` | Faible | 🟠 Majeur |
| | Harmoniser la regex téléphone camerounaise | `login.js`, `payment.js` | Faible | 🟡 Mineur |
| **2. Résilience Erreurs (Jours 2-3)** | Créer le store centralisé d'erreur `useModalStore` | Nouveau `store/modal.store.js` | Moyen | 🔴 Critique |
| | Déployer le composant `AdmaModal` unique et accessible | Nouveau `components/ui/AdmaModal.jsx` | Moyen | 🔴 Critique |
| | Implémenter la table de correspondance code backend ➔ i18n | `services/api.js`, `i18n/*.json` | Moyen | 🔴 Critique |
| | Ajouter l'`ErrorBoundary` global et l'écran de secours | `app/_layout.js`, `+error.js` | Faible | 🔴 Critique |
| | Synchroniser la déconnexion sur échec de refresh token | `services/api.js`, `auth.store.js` | Faible | 🔴 Critique |
| **3. Réseau & Serveur (Jours 4-5)** | Ajuster le timeout Axios (45s) et message d'éveil Render | `services/api.js`, `LoadingScreen.js` | Faible | 🟠 Majeur |
| | Corriger les blocs catch muets (recherche, favoris, profil) | `search.js`, `profile.js`, `favorites.js` | Moyen | 🔴 Critique |
| | Supprimer le clignotement du splash screen au démarrage | `app/_layout.js`, `LoadingScreen.js` | Faible | 🟡 Mineur |
| **4. Finition UI/UX (Jours 6-7)** | Persistance de la transaction de paiement USSD en cours | `subscription/payment.js`, `profile.js` | Moyen | 🟠 Majeur |
| | Harmoniser l'icône de `VerifiedBadge` avec Lucide | `VerifiedBadge.js` | Faible | 🟡 Mineur |
| | Agrandir les cibles tactiles (< 44 dp) | Multiples écrans | Moyen | 🟡 Mineur |
| | Nettoyer `package.json` (`worklets-core`, `react-dom`) | `package.json` | Faible | 🔵 Suggestion |

---

## 10. Architecture Recommandée pour un Système d'Erreur 10/10

Pour garantir qu'**aucune erreur client ou serveur ne soit plus jamais affichée via des popups natifs ou des messages bruts non traduits**, voici l'architecture complète recommandée :

### 10.1 Store Zustand centralisé : `store/modal.store.js`

```javascript
import { create } from 'zustand';

export const useModalStore = create((set, get) => ({
  queue: [],
  currentModal: null,

  show: ({
    type = 'error', // 'error' | 'warning' | 'success' | 'network' | 'session' | 'permission'
    title,
    message,
    confirmText,
    cancelText = null,
    onConfirm = null,
    onCancel = null,
    dismissible = true,
  }) => {
    const modalData = {
      id: Date.now() + Math.random(),
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
      dismissible,
    };

    if (!get().currentModal) {
      set({ currentModal: modalData });
    } else {
      set((state) => ({ queue: [...state.queue, modalData] }));
    }
  },

  dismiss: () => {
    const { queue, currentModal } = get();
    if (currentModal?.onCancel) currentModal.onCancel();

    if (queue.length > 0) {
      const [next, ...remaining] = queue;
      set({ currentModal: next, queue: remaining });
    } else {
      set({ currentModal: null });
    }
  },

  confirm: () => {
    const { queue, currentModal } = get();
    if (currentModal?.onConfirm) currentModal.onConfirm();

    if (queue.length > 0) {
      const [next, ...remaining] = queue;
      set({ currentModal: next, queue: remaining });
    } else {
      set({ currentModal: null });
    }
  },
}));
```

---

### 10.2 Table de correspondance des codes backend ➔ Clés i18n

Dans `services/api.js`, intercepter chaque erreur HTTP et la traduire avant propagation :

```javascript
// services/api.js (Intercepteur de réponse modernisé)
import i18n from '../i18n';
import { useModalStore } from '../store/modal.store';
import { useAuthStore } from '../store/auth.store';

const ERROR_CODE_MAP = {
  // Authentification & Session
  UNAUTHORIZED:           'errors.unauthorized',
  TOKEN_EXPIRED:          'errors.sessionExpired',
  INVALID_REFRESH_TOKEN:  'errors.sessionExpired',
  USER_NOT_FOUND:         'errors.userNotFound',
  ACCOUNT_SUSPENDED:      'errors.accountSuspended',
  ACCOUNT_DELETED:        'errors.accountDeleted',
  
  // OTP
  OTP_INVALID:            'errors.otpInvalid',
  OTP_EXPIRED:            'errors.otpExpired',
  OTP_MAX_ATTEMPTS:       'errors.otpMaxAttempts',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED:    'errors.rateLimitExceeded',
  
  // Paiements & Abonnements
  INVALID_PLAN:           'errors.invalidPlan',
  INVALID_OPERATOR:       'errors.invalidOperator',
  INVALID_PHONE:          'errors.invalidPhone',
  NO_PROVIDER:            'errors.noProvider',
  PAYMENT_NOT_FOUND:      'errors.paymentNotFound',
  PAYMENT_FAILED:         'errors.paymentFailed',
  
  // Fichiers & Contenu
  LIMIT_FILE_SIZE:        'errors.fileTooLarge',
  LIMIT_UNEXPECTED_FILE:  'errors.fileInvalidFormat',
  DUPLICATE:              'errors.alreadyExists',
  ALREADY_REVIEWED:       'errors.alreadyReviewed',
  CANT_REVIEW_OWN:        'errors.cantReviewOwn',
  
  // Système & BD
  DATABASE_UNAVAILABLE:   'errors.dbUnavailable',
  INTERNAL_ERROR:         'errors.serverError',
  NOT_FOUND:              'errors.notFound',
};

export function getLocalizedErrorMessage(err) {
  if (!err.response) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return i18n.t('errors.serverWakingUp', 'Le serveur prend du temps à répondre. Veuillez patienter.');
    }
    return i18n.t('errors.noConnection', 'Connexion internet indisponible. Vérifiez votre réseau.');
  }

  const code = err.response.data?.code;
  if (code && ERROR_CODE_MAP[code]) {
    return i18n.t(ERROR_CODE_MAP[code]);
  }

  // Repli propre : jamais de message technique, message backend seulement s'il existe
  return err.response.data?.message || i18n.t('errors.generic', 'Une erreur inattendue est survenue.');
}
```

---

### 10.3 Composant Modal Universel : `components/ui/AdmaModal.jsx`

```jsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Keyboard, BackHandler } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { AlertCircle, CheckCircle2, TriangleAlert, WifiOff, Lock, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../store/modal.store';
import { colors } from '../../constants/colors';

const VARIANTS = {
  error:      { icon: AlertCircle,   color: colors.danger,     bg: colors.dangerBg },
  warning:    { icon: TriangleAlert, color: colors.warning,    bg: colors.warningBg },
  success:    { icon: CheckCircle2,  color: colors.success,    bg: colors.successBg },
  network:    { icon: WifiOff,       color: colors.warning,    bg: colors.warningBg },
  session:    { icon: Lock,          color: colors.navy,       bg: colors.surface },
  permission: { icon: Settings,      color: colors.primaryDark,bg: colors.primaryBg },
};

export function AdmaModal() {
  const { t } = useTranslation();
  const modal = useModalStore((s) => s.currentModal);
  const dismiss = useModalStore((s) => s.dismiss);
  const confirm = useModalStore((s) => s.confirm);

  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (modal) {
      Keyboard.dismiss();
      scale.value = withSpring(1, { damping: 18, stiffness: 220 });
    } else {
      scale.value = 0.9;
    }
  }, [modal]);

  useEffect(() => {
    const onBackPress = () => {
      if (modal) {
        if (modal.dismissible) dismiss();
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [modal]);

  if (!modal) return null;

  const config = VARIANTS[modal.type] || VARIANTS.error;
  const Icon = config.icon;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal
      transparent
      visible={!!modal}
      animationType="fade"
      accessibilityViewIsModal={true}
      accessibilityRole="alertdialog"
      onRequestClose={modal.dismissible ? dismiss : undefined}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={modal.dismissible ? dismiss : undefined}
        />
        <Animated.View style={[styles.card, animatedStyle]}>
          <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
            <Icon size={26} color={config.color} strokeWidth={2.2} />
          </View>

          <Text style={styles.title}>{modal.title || t('common.error')}</Text>
          <Text style={styles.message}>{modal.message}</Text>

          <View style={styles.actions}>
            {modal.cancelText && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={dismiss}
                activeOpacity={0.75}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>{modal.cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                modal.type === 'error' && styles.confirmBtnDanger,
              ]}
              onPress={confirm}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>{modal.confirmText || t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(11, 22, 44, 0.65)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: colors.white,
    borderRadius: 24, padding: 24, alignItems: 'center',
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  iconWrap: {
    width: 58, height: 58, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.navy, textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  confirmBtn: {
    flex: 2, height: 48, borderRadius: 14, backgroundColor: colors.navy,
    justifyContent: 'center', alignItems: 'center',
  },
  confirmBtnDanger: { backgroundColor: colors.dangerDark },
  confirmText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
```

---

### 10.4 ErrorBoundary Global : `components/ErrorBoundary.jsx`

```jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { colors } from '../constants/colors';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ADMA Crash]', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={36} color={colors.danger} />
            </View>
            <Text style={styles.title}>Une interruption est survenue</Text>
            <Text style={styles.body}>
              L'application a rencontré un incident inattendu. Vos données enregistrées sont préservées.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={this.handleRestart} activeOpacity={0.8}>
              <RotateCcw size={18} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.retryText}>Relancer l'application</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 32, alignItems: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.dangerBg, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.navy, textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  retryBtn: { flexDirection: 'row', backgroundColor: colors.navy, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, alignItems: 'center' },
  retryText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
```

---

## 11. Checklist Finale « Pour Atteindre 10/10 »

Pour hisser l'application Adma au sommet de la qualité mobile professionnelle (10/10), voici les critères précis à valider :

- [ ] **Zéro popup natif** : Les 3 occurrences d'`Alert.alert` dans `payment.js` et `plans.js` sont supprimées et remplacées par `AdmaModal`.
- [ ] **Contraste 4.5:1 garanti** : `#5FC2BA` n'est plus utilisé comme couleur de texte sur fond blanc. Remplacé par `#167C74` ou `#136B64` pour le texte et les bordures de boutons secondaires/ghost.
- [ ] **Traduction 100% des erreurs API** : Tous les codes applicatifs du backend sont traduits dans les 3 catalogues (`fr.json`, `en.json`, `ful.json`). Aucun message technique ou serveur brut n'apparaît.
- [ ] **Démarrage instantané et sans saut** : Le splash screen natif reste affiché tant que les polices, le cache SQLite et les clés i18n ne sont pas chargés, éliminant tout clignotement ou double logo.
- [ ] **Persistance du paiement USSD** : L'ID de checkout est conservé dans le stockage local pour permettre à l'utilisateur de quitter l'écran et de revenir vérifier l'état du paiement sans recommencer.
- [ ] **Tolérance au démarrage Render** : Timeout de requête ajusté à 45s avec modal de progression rassurant en cas d'éveil d'instance gratuite.
- [ ] **Éradication des catchs silencieux** : Les requêtes de recherche, favoris et profil gèrent explicitement l'état d'erreur avec un visuel dédié et un bouton « Réessayer ».
- [ ] **Synchronisation de session** : En cas d'invalidation du refresh token, `useAuthStore.getState().logout()` est immédiatement déclenché avec un modal explicite de reconnexion.
- [ ] **Nettoyage des permissions Android** : Suppression de `WRITE_EXTERNAL_STORAGE` et `RECEIVE_BOOT_COMPLETED` dans `app.json`.
- [ ] **Bouton Paramètres sur refus de permission** : Chaque refus de permission (caméra, galerie, GPS) offre un bouton direct vers `Linking.openSettings()`.
- [ ] **Cohérence de la grille tarifaire** : Suppression des prix statiques de `config.js` et affichage des tarifs réels de fidélité issus de l'API.
- [ ] **Protection globale contre les crashs** : `ErrorBoundary` installé à la racine de `app/_layout.js`.
- [ ] **Zones tactiles conformes** : Tous les éléments interactifs atteignent au minimum 44×44 dp.
- [ ] **Code source épuré** : Retrait de `react-native-worklets-core`, `react-dom` et `react-native-web` de `package.json`.
