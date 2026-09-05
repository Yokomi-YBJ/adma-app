 Voici la procédure pour obtenir les clés API des services utilisés par l'application, ainsi qu'une estimation de
  leurs coûts en production.

  1. Twilio (OTP SMS)
  Utilisé pour l'authentification et la vérification des numéros de téléphone.
   * Procédure : 
       1. Créer un compte sur twilio.com (https://www.twilio.com/).
       2. Dans la console, récupérer l'Account SID et le Auth Token.
       3. Acheter ou vérifier un numéro de téléphone Twilio pour envoyer les SMS.
   * Coût Production : Pay-as-you-go (paiement à l'usage). Le prix varie selon le pays de destination (le Cameroun a
     des tarifs spécifiques). Un compte d'essai gratuit est disponible pour le développement.

  2. Cloudinary (Stockage Images)
  Utilisé pour l'hébergement et l'optimisation des photos des prestataires et profils.
   * Procédure : 
       1. Créer un compte sur cloudinary.com (https://cloudinary.com/).
       2. Aller dans le archand sur le portail kpay.site (https://admin.kpay.site/).
       2. Une fois le compte validé, récupérer l'API Key et la Secret Key dans les paramètres API.
       3. Configurer l'URL de Webhook pour recevoir les notifications de paiement.
   * Coût Production : Généralement basé tableau de bord pour copier le Cloud Name, l'API Key et l'API Secret.
   * Coût Production : Plan Gratuit très généreux (basé sur des crédits mensuels). Pour un trafic très élevé, des
     plans payants existent.

  3. KPay (Paiements Mobile Money)
  Passerelle de paiement locale pour les transactions.
   * Procédure : 
       1. S'enregistrer en tant que msur une commission par transaction (percentage fee). Pas de frais mensuels
     fixes habituellement.

  4. Resend (Emails OTP Admin)
  Utilisé pour l'envoi d'emails transactionnels (notifications admin, OTP).
   * Procédure : 
       1. Créer un compte sur resend.com (https://resend.com/).
       2. Ajouter et vérifier le domaine de l'entreprise (ex: adma.cm).
       3. Générer une API Key dans la section "API Keys".
   * Coût Production : Gratuit jusqu'à 3 000 emails/mois. Au-delà, passage à un plan payant.

  5. Expo (Notifications Push)
  Utilisé pour envoyer des notifications sur iOS et Android.
   * Procédure : 
       1. Se connecter à son compte sur expo.dev (https://expo.dev/).
       2. Aller dans Account Settings → Access Tokens.
       3. Créer un nouveau token et le copier.
   * Coût Production : Gratuit pour l'envoi de notifications push via le service EAS.

  ---

  Résumé pour le déploiement :
  La majorité des services ont des tiers gratuits permettant de lancer l'application sans frais initiaux. Le poste de
  dépense principal sera Twilio (coût par SMS envoyé) et les commissions de KPay sur les ventes.
