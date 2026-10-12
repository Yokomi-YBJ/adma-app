# Site vitrine ADMA

Site 100 % statique (HTML, CSS, JavaScript natif). Aucun build, aucune dépendance, aucun CDN : les polices, images et scripts sont servis avec le site. Mode clair uniquement. Aucun effet de curseur.

## Arborescence

```
privacy-policy/
├── index.html                       Accueil
├── cgu.html                         Conditions générales d'utilisation
├── politique-confidentialite.html   Politique de confidentialité
├── mentions-legales.html            Mentions légales
├── robots.txt  sitemap.xml  manifest.webmanifest  favicon.ico
├── scripts/configure.py             Configure le domaine et les e-mails (voir plus bas)
└── assets/
    ├── css/   main.css (design system, composants)  pages.css (sections et pages)
    ├── js/    main.js (menu, progression, navigation)  animations.js (motion)
    ├── img/   écrans de l'app (WebP), logo, icônes, image de partage
    ├── video/ animation du logo
    └── fonts/ Poppins et Lora (sous-ensemble latin)
```

## Déployer

**Vercel** : créer un projet lié au dépôt et définir *Root Directory* sur `WebSite`. Aucun build n'est nécessaire. `vercel.json` active les URL sans extension pour que les pages HTML restent accessibles directement.

## Domaine de production

Le site est hébergé sur Vercel : https://adma-app-website.vercel.app. Les URL canoniques, Open Graph, Twitter Cards, JSON-LD, sitemap et robots.txt sont configurés pour ce domaine. Pour le changer, relancez le script avec le nouveau domaine :

```
python3 scripts/configure.py --domain https://votre-nouveau-domaine.cm
```

Le script met à jour `sitemap.xml`, `robots.txt`, les balises canonical, Open Graph, Twitter Cards et le JSON-LD. Il peut aussi remplacer les adresses de contact si nécessaire.

## Mettre à jour l'APK

1. Créer le dossier `assets/apk/` et y déposer le fichier, par exemple `assets/apk/adma-v1.1.apk`.
2. Dans `index.html`, remplacer `href="#"` par `href="assets/apk/adma-v1.1.apk"` sur les 3 boutons `download="adma-v1.1.apk"` (hero, section Android, bloc final).
3. Pour une nouvelle version : changer le nom du fichier et l'attribut `download`, puis la version et la date dans la section Android, le bloc final (`file-card`) et le JSON-LD (`softwareVersion`).

Rechercher `adma-v1.1` et `Octobre 2026` dans `index.html` pour tout retrouver.

## Contenu volontairement absent

Le site ne parle ni d'abonnements, ni de tarifs, ni de paiement. Les CGU et la politique de confidentialité contiennent seulement une clause neutre sur d'éventuelles « fonctionnalités optionnelles », sans nommer de prestataire de paiement. Si l'application traite des paiements, il faudra ajouter les mentions correspondantes avant le lancement commercial.

## Motion et accessibilité

- Motion en JavaScript natif : apparitions au défilement, manifeste dont les mots s'allument, parallaxe du hero, vitrine à défilement fixe où l'écran change avec l'étape, bandeau de métiers, barre de progression.
- `prefers-reduced-motion` désactive toutes les animations ; le contenu reste visible.
- Sans JavaScript, tout le contenu reste lisible (les états masqués ne s'appliquent qu'avec la classe `js`).
- Lien d'évitement, focus visible, menu et FAQ accessibles au clavier (`aria-expanded`, `<details>`), un seul `h1` par page, textes alternatifs descriptifs.
- Contrastes vérifiés pour tous les couples de couleurs (AA).

## Modifier le contenu

- **Couleurs et typographie** : variables en tête de `assets/css/main.css`.
- **Textes de l'accueil** : directement dans `index.html`.
- **Pages légales** : les trois fichiers HTML ; la date de mise à jour est en haut de chaque page (`legal-meta`).
- **Captures d'écran** : remplacer les fichiers `assets/img/screen-*.webp` en gardant le ratio 720 x 1536.

## Remarques sur les captures d'écran fournies

- Les captures d'origine ont été retirées du dossier : certaines contenaient un nom, une photo et un numéro de téléphone réels. Les versions du site sont recadrées (sans barre d'état) et sans donnée personnelle.
- Sur l'écran de profil prestataire, une pastille affichait la clé de traduction brute `trustBadge.reliable` ; elle a été masquée dans l'image. Les libellés `search.category` et `search.city` s'affichent aussi bruts dans l'écran Filtres de l'application. À corriger dans l'application, puis à refaire sur les captures.
- La carte « Devenir Prestataire » de l'application annonce « des milliers de clients » : elle n'est pas utilisée sur le site pour éviter une promesse non vérifiable.

## Performance

Pas de bibliothèque JavaScript, polices en sous-ensemble (environ 90 Ko), images WebP avec dimensions explicites, `loading="lazy"` hors hero, vidéo en `preload="metadata"` avec poster, lecture uniquement quand elle est visible. Une minification optionnelle est possible (par exemple `npx esbuild assets/css/main.css --minify`), mais elle n'est pas nécessaire.

## Crédits

Polices Poppins et Lora, licence SIL Open Font License 1.1.
