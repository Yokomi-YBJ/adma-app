# RAPPORT D’AUDIT UX/UI — ADMA Mobile
**Date** : 21 octobre 2026  
**Version analysée** : 1.0.0  
**Auditeur** : Copilot (expert UX/UI)  
**Score global** : **6/10**

## Résumé exécutif
> Les parcours essentiels sont présents et l’interface dispose de cache local, de skeletons et de formulaires en étapes.  
> Les faiblesses les plus sensibles sont les erreurs réseau souvent silencieuses, le contraste insuffisant de l’accent turquoise et des notifications marquées comme lues dès l’ouverture.  
> Les traductions ont une structure complète dans les trois langues, mais certains écrans restent en français et le fulfulde n’a pas été validé par un locuteur.  
> Verdict : application utilisable, mais la fiabilité perçue, l’accessibilité et la confiance lors des paiements doivent progresser avant de la qualifier de facile pour tous.

Audit statique des sources : aucun test utilisateur, aucune mesure de performance sur appareil et aucune capture d’écran n’ont été examinés. Les nombres d’étapes ci-dessous sont estimés à partir des interactions prévues dans le code.

## 1. Analyse UX (note /5 par critère)

| Critère | Note | Forces | Faiblesses | Recommandation |
|---|---:|---|---|---|
| Navigabilité | 3,5 | Quatre onglets explicites; accès direct à la recherche, au profil prestataire et aux avis ([navigation](frontend/mobile/app/%28tabs%29/_layout.js), [accueil](frontend/mobile/app/%28tabs%29/index.js)). | Créer une fiche nécessite de passer par le profil; le parcours abonnement implique plusieurs écrans et une page de paiement externe. | Garder les actions fréquentes accessibles depuis les écrans concernés et indiquer le nombre d’étapes restantes. |
| Charge cognitive | 3 | L’accueil sépare catégories et recommandations; la création est découpée en 4 étapes ([création de fiche](frontend/mobile/app/provider/create.js)). | L’étape « Localisation et contact » rassemble ville, quartier, GPS, plans et coordonnées. Les forfaits montrent rayon et prix, mais peu de comparaison des bénéfices. | Réduire les champs visibles simultanément et comparer clairement les avantages de chaque forfait. |
| Feedback | 2,5 | Skeletons, indicateurs de chargement et confirmations sont présents ([Skeleton](frontend/mobile/components/ui/Skeleton.js), [Button](frontend/mobile/components/ui/Button.js)). | Recherche, favoris et métadonnées peuvent échouer sans message ni action de reprise. Dans les notifications, l’échec du marquage est masqué. | Afficher des états d’erreur et de reprise là où les requêtes échouent silencieusement. |
| Onboarding | 3 | Trois écrans localisés présentent recherche, confiance et contact, avec option « Passer » ([onboarding](frontend/mobile/app/onboarding/index.js)). | Pour un nouvel utilisateur, l’onboarding arrive après l’inscription OTP; la valeur de l’app n’est donc pas montrée avant la demande de numéro. | Présenter la proposition de valeur avant l’OTP, ou proposer un accès invité à la recherche. |
| Gestion des erreurs | 2 | L’API fournit des messages utilisateur et certains formulaires affichent une erreur claire ([API](frontend/mobile/services/api.js), [connexion](frontend/mobile/app/%28auth%29/login.js)). | Le profil interprète une erreur de chargement comme l’absence de fiche et peut proposer à tort d’en créer une. Les erreurs de recherche et de favoris sont souvent absorbées. | Distinguer explicitement « aucune fiche » de « chargement impossible »; proposer une nouvelle tentative. |
| Accessibilité | 2 | Les contrôles principaux sont généralement accompagnés de texte; quelques sélecteurs exposent leur rôle d’accessibilité. | Plusieurs textes font 11–13 px; certaines cibles font 40–42 px. Le texte blanc sur l’accent turquoise présente un contraste de 2,12:1, insuffisant pour du texte courant. | Viser au moins 4,5:1 pour le texte courant, des cibles de 44×44 px et des libellés accessibles pour les boutons icône seule. |
| Multilingue | 3,5 | Les trois fichiers de langue ont les mêmes **551 clés**; le fulfulde est configuré avec détection et fallback français ([i18n](frontend/mobile/i18n/index.js)). | Des textes restent codés en français, notamment dans les forfaits/paiements. Les filtres de recherche privilégient `name_fr`; les notifications push reçues sont stockées comme `title_fr`/`body_fr`. La qualité linguistique du fulfulde n’est pas vérifiable par comparaison de clés. | Utiliser la langue active partout et faire relire les textes fulfulde par un locuteur. |
| Performance perçue | 3,5 | Cache SQLite pour l’accueil et les détails, skeletons et pagination de recherche ([cache](frontend/mobile/services/cache.js), [recherche](frontend/mobile/app/%28tabs%29/search.js)). | Le cache de recherche ne porte que sur les métadonnées; favoris et notifications n’ont pas de fallback local visible. Les images n’ont pas de redimensionnement explicite avant envoi. | Ajouter un état hors-ligne cohérent aux vues clés et compresser/redimensionner les images. |
| Confiance | 3 | Badge de vérification, statut de disponibilité, avis et score sont affichés ([détail prestataire](frontend/mobile/app/provider/%5Bid%5D.js), [badge](frontend/mobile/components/ui/VerifiedBadge.js)). | Le badge est souvent une icône sans explication. Le formulaire CNI annonce chiffrement et suppression des documents, mais ces garanties ne peuvent pas être confirmées par l’interface seule. | Expliquer les badges au premier affichage et rendre les garanties de traitement des pièces vérifiables et cohérentes. |
| Friction de paiement | 2,5 | Le montant, l’opérateur, le numéro et les tarifs de fidélité sont visibles ([forfaits](frontend/mobile/app/subscription/plans.js), [paiement](frontend/mobile/app/subscription/payment.js)). | Checkout externe puis attente par polling jusqu’à 90 s; après expiration, pas de bouton de reprise ou de vérification manuelle. Une sortie de paiement peut laisser l’utilisateur incertain. | Afficher durée, montant récurrent et prochaine échéance; permettre de reprendre ou vérifier le statut sans recommencer. |

## 2. Analyse UI (note /5 par critère)

| Critère | Note | Forces | Faiblesses | Recommandation |
|---|---:|---|---|---|
| Cohérence visuelle | 3 | Le navy `#0B162C` et le turquoise `#5FC2BA` structurent la plupart des écrans ([palette](frontend/mobile/constants/colors.js)). | L’écran forfaits redéfinit sa palette au lieu d’utiliser les tokens partagés. Plus Jakarta Sans n’est pas chargé dans l’app; les écrans utilisent principalement les polices natives. | Centraliser les couleurs et charger la typographie prévue, ou documenter le choix de la police native. |
| Hiérarchie visuelle | 3,5 | Titres et CTA principaux ressortent; paiement et création ont une action finale bien identifiable. | Dans les forfaits, le schéma de rayon attire l’attention sans expliquer suffisamment les différences entre offres. | Donner la priorité à une comparaison des bénéfices, prix et conditions. |
| Densité d’information | 3 | Les sections de la fiche prestataire sont séparées et les listes sont paginées. | L’étape 2 de création est dense; les détails prestataire peuvent être longs. À l’inverse, la page forfaits réserve beaucoup d’espace au visualiseur de rayon. | Rééquilibrer l’espace et réduire les blocs de formulaire par divulgation progressive. |
| Iconographie | 3,5 | Lucide est largement utilisé; les icônes de recherche, carte, avis et contact sont accompagnées de texte dans les actions principales. | La navigation d’onglets utilise Ionicons et les badges Material Icons; certains contrôles icône seule ne sont pas explicitement nommés pour les lecteurs d’écran. | Harmoniser les bibliothèques lorsque pertinent et ajouter des libellés d’accessibilité. |
| États des composants | 3 | Le bouton partagé gère chargement et état désactivé; skeletons et états vides existent. | Plusieurs vues confondent erreur et absence de données ou n’offrent aucun retry. Le chargement des notifications peut brièvement laisser apparaître l’état vide. | Définir pour chaque vue les états loading, empty, error, offline et success. |
| Responsive | 2,5 | Les listes principales s’appuient sur `FlatList` et les formulaires défilent. | Des dimensions sont fixes (cibles de 40–42 px, chronologie de forfaits, segments calculés depuis `Dimensions`); aucun test petit écran ou texte agrandi n’est fourni. | Tester sur petit Android, avec clavier ouvert, rotation si supportée et taille de texte système augmentée. |

## 3. Cas d’usage critiques

| Parcours | Étapes | Frictions | Recommandation |
|---|---|---|---|
| Inscription OTP SMS | Environ 3 interactions : saisir le numéro, demander le code, saisir les 6 chiffres; vérification automatique. | Renvoi bloqué 60 s; erreur serveur parfois affichée telle quelle. L’onboarding vient après l’OTP pour un nouvel utilisateur. | Montrer la valeur avant de demander le numéro et ajouter une explication de dépannage SMS. |
| Création d’une fiche prestataire | 4 étapes; depuis le profil : ouvrir la création, 3 fois « Suivant », puis publier, sans compter la saisie et les sélections. | Étape 2 dense; dépend des métadonnées réseau; photo et GPS demandent des permissions. | Sauvegarder le brouillon et rendre les champs obligatoires plus visibles. |
| Recherche d’un prestataire proche | Environ 3 taps depuis l’accueil : onglet Recherche, bouton GPS, résultat. | Permission système requise; si refusée, passage aux paramètres puis retour. Les erreurs de recherche ne sont pas expliquées. | Proposer aussi une recherche par ville/quartier et un retry explicite. |
| Paiement d’un abonnement | Depuis le profil, environ 5 taps jusqu’au lancement du paiement : forfait, sélection, continuer, opérateur, payer; puis confirmation externe. | Attente pouvant atteindre 90 s, sans reprise claire; cohérence des numéros à contrôler : connexion accepte `6[4-9]`, paiement `6[5-9]`. | Afficher les étapes restantes et un état « vérifier le paiement » après retour du checkout. |
| Publication d’un avis | Environ 4 taps depuis un résultat : ouvrir la fiche, ouvrir le formulaire, choisir un verdict, envoyer; commentaire facultatif. | L’avis demande un verdict, mais la distinction entre les trois choix repose en partie sur les icônes/couleurs. | Ajouter une courte explication aux choix et confirmer l’envoi sans ambiguïté. |
| Demande de vérification CNI | Depuis le profil : ouvrir vérification, ajouter le recto, choisir la photo, envoyer; verso facultatif. | Le recto est obligatoire; l’écran annonce un délai de 24–48 h, tandis que le message de succès annonce 48 h. | Harmoniser le délai et expliquer avant l’envoi l’usage, la conservation et la suppression des pièces. |
| Réception d’une notification | Réception : aucune action; ouverture depuis le push : 1 tap attendu. Dans l’app : ouvrir la cloche puis toucher une notification. | À l’ouverture de la liste, toutes les notifications sont marquées comme lues. Toucher une ligne ne fait que la marquer comme lue. Les destinations push (`Provider`, `Verification`, etc.) ne correspondent pas aux chemins de fichiers Expo Router et doivent être vérifiées. | Marquer comme lu seulement à l’action explicite et router vers les chemins réels, avec paramètres. |
| Changement de plan | Environ 5 interactions depuis le profil avant checkout, puis validation opérateur; un downgrade peut être programmé par le serveur. | La programmation est présentée par une alerte et le paiement revient dans un flux externe; comparaison des avantages limitée. | Distinguer clairement upgrade immédiat, downgrade différé, date d’effet et montant dû. |

## 4. Accessibilité Afrique francophone

**Points forts**
- Cache SQLite avec TTL pour l’accueil et le détail prestataire; l’accueil dispose d’une bannière hors ligne et d’un rafraîchissement manuel.
- Skeletons sur plusieurs vues, formulaires découpés, libellés textuels pour de nombreuses actions.
- Les catalogues de traduction ont une parité de clés complète.

**Axes d’amélioration**
- **Connexion lente** : l’état `isOnline` est lu dans l’accueil mais n’y pilote pas l’affichage; la détection repose surtout sur l’échec des requêtes. Recherche, favoris et notifications n’ont pas de véritable fallback de contenu.
- **Petits forfaits data** : sélection photo à qualité 0,85, mais pas de redimensionnement explicite; les vues chargent des images distantes sans stratégie de chargement basse résolution évidente.
- **Littératie numérique** : les icônes de vérification et certains boutons isolés manquent d’explication. Employer des consignes simples et des états verbaux plutôt que la couleur seule.
- **Appareils anciens** : le dépôt ne permet pas d’affirmer la compatibilité fluide avec Android 10 et 2 Go de RAM. Les listes de recherche sont virtualisées, mais il faut mesurer démarrage, mémoire et décodage photo sur appareil réel.
- **Confiance** : l’écran CNI présente des promesses de confidentialité et des bénéfices de classement; le paiement explique la validation opérateur, mais le détail des échéances et les voies de support après débit incertain méritent d’être renforcés.

## 5. Verdict final

### Note globale : 6/10
**L’app peut-elle être considérée comme facile à utiliser pour un utilisateur camerounais moyen ?**  
**Partiellement.** La navigation de base est compréhensible et les parcours existent, mais l’utilisateur peut être bloqué par une erreur silencieuse, ne pas comprendre un badge ou rester incertain après un paiement en attente. Je ne la qualifierais pas encore de facile sans réserve.

### 3 quick wins
1. Supprimer le marquage automatique de toutes les notifications comme lues; corriger les destinations des notifications push.
2. Corriger le contraste des boutons et liens turquoise; viser 4,5:1 pour le texte courant et des cibles tactiles d’au moins 44×44 px.
3. Ajouter retry et messages différenciant erreur réseau et absence de données, en priorité dans Recherche, Favoris et Profil.

### 3 chantiers de fond
1. Reconcevoir le parcours paiement comme une suite d’états récupérables : prix et échéance explicites, retour checkout, statut vérifiable et reprise après interruption.
2. Renforcer le mode faible connectivité : cache des résultats clés, états hors-ligne cohérents et optimisation réelle des images.
3. Conduire des tests avec des utilisateurs de Ngaoundéré sur petits Android, puis corriger l’accessibilité et faire valider les textes fulfulde par des locuteurs.

## 6. Annexe : captures d’écran à examiner
Aucune capture n’a été fournie; ces écrans restent à examiner sur appareil.

- [ ] Écran d’accueil
- [ ] Écran de recherche
- [ ] Fiche prestataire
- [ ] Écran de paiement
- [ ] Écran de succès
- [ ] Écran de profil
- [ ] Écran de notifications