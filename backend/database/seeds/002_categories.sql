-- ============================================================
-- ADMA — Seed : Catégories et sous-catégories
-- Langues : Français / Anglais / Fulfulde
-- ============================================================

-- CATÉGORIES PARENTES
INSERT INTO categories (id, parent_id, name_fr, name_en, name_ful, slug, icon, sort_order) VALUES
  (1,  NULL, 'Réparation & Technique',   'Repair & Technical',     'Keblugol & Teknik',  'reparation-technique',  'wrench',       1),
  (2,  NULL, 'Artisanat & Mode',          'Craft & Fashion',        'Tafol & Liggol',     'artisanat-mode',        'scissors',     2),
  (3,  NULL, 'Construction & Habitat',    'Construction & Housing',  'Galle & Towgol',     'construction-habitat',  'home',         3),
  (4,  NULL, 'Services quotidiens',       'Daily Services',         'Gollorɗe Hannde',    'services-quotidiens',   'briefcase',    4),
  (5,  NULL, 'Formation & Éducation',     'Training & Education',   'Janngugol & Suɗe',  'formation-education',   'book-open',    5),
  (6,  NULL, 'Alimentation & Traiteur',   'Food & Catering',        'Ñamangu & Nyaamoowo','alimentation-traiteur', 'utensils',     6);

-- SOUS-CATÉGORIES — Réparation & Technique (parent 1)
INSERT INTO categories (parent_id, name_fr, name_en, name_ful, slug, sort_order) VALUES
  (1, 'Mécanicien automobile',      'Car Mechanic',            'Mekaniki Moto Mawnde',  'mecanicien-auto',        1),
  (1, 'Mécanicien moto',            'Motorcycle Mechanic',     'Mekaniki Moto',         'mecanicien-moto',        2),
  (1, 'Électricien',                'Electrician',             'Elektrisiyee',          'electricien',            3),
  (1, 'Plombier',                   'Plumber',                 'Ɓalaaɓe Ndiyam',        'plombier',               4),
  (1, 'Soudeur',                    'Welder',                  'Soodooɗo Ferel',        'soudeur',                5),
  (1, 'Carrossier',                 'Body Shop',               'Carrossiyee',           'carrossier',             6),
  (1, 'Réparateur téléphone',       'Phone Repair',            'Keblooɗo Telefon',      'reparateur-telephone',   7),
  (1, 'Réparateur électroménager',  'Appliance Repair',        'Keblooɗo Elektrik',     'reparateur-electromenager',8),
  (1, 'Frigoriste',                 'Refrigeration Tech',      'Frigoriste',            'frigoriste',             9),
  (1, 'Réparateur informatique',    'Computer Repair',         'Keblooɗo Ordinateer',   'reparateur-informatique',10);

-- SOUS-CATÉGORIES — Artisanat & Mode (parent 2)
INSERT INTO categories (parent_id, name_fr, name_en, name_ful, slug, sort_order) VALUES
  (2, 'Couturier / Couturière',   'Tailor',          'Dikiliiɗo',          'couturier',   1),
  (2, 'Brodeur / Brodeuse',       'Embroiderer',     'Brodooɗo',           'brodeur',     2),
  (2, 'Cordonnier',               'Cobbler',         'Saŋkooɗo Yayre',     'cordonnier',  3),
  (2, 'Tailleur traditionnel',    'Traditional Tailor','Dikiliiɗo Laaɓal',  'tailleur-trad',4),
  (2, 'Coiffeur / Coiffeuse',     'Barber / Hairdresser','Cefoowo',         'coiffeur',    5),
  (2, 'Tresseur / Tresseuse',     'Braider',         'Tressooɗo',          'tresseur',    6);

-- SOUS-CATÉGORIES — Construction & Habitat (parent 3)
INSERT INTO categories (parent_id, name_fr, name_en, name_ful, slug, sort_order) VALUES
  (3, 'Maçon',                  'Mason',             'Maason',             'macon',        1),
  (3, 'Peintre',                'Painter',           'Peentooɗo Galle',    'peintre',      2),
  (3, 'Menuisier',              'Carpenter',         'Kaarpitiiyee',       'menuisier',    3),
  (3, 'Carreleur',              'Tiler',             'Karelooɗo',          'carreleur',    4),
  (3, 'Vitrier',                'Glazier',           'Vitooriiɗo',         'vitrier',      5),
  (3, 'Faux-plafonniste',       'Ceiling Installer', 'Foos-plaafooniste',  'faux-plafonniste',6);

-- SOUS-CATÉGORIES — Services quotidiens (parent 4)
INSERT INTO categories (parent_id, name_fr, name_en, name_ful, slug, sort_order) VALUES
  (4, 'Photographe',            'Photographer',      'Fotograafiiɗo',      'photographe',  1),
  (4, 'Imprimeur',              'Printer',           'Imprimooɗo',         'imprimeur',    2),
  (4, 'Gardien / Agent de sécurité','Security Guard','Gardiyee',           'gardien',      3),
  (4, 'Laveur de voiture',      'Car Washer',        'Dooɗo Moto Mawnde',  'laveur-voiture',4),
  (4, 'Livreur',                'Delivery Person',   'Jowiriiɗo',          'livreur',      5),
  (4, 'Déménageur',             'Mover',             'Ummowtooɗo',         'demenageur',   6);

-- SOUS-CATÉGORIES — Formation & Éducation (parent 5)
INSERT INTO categories (parent_id, name_fr, name_en, name_ful, slug, sort_order) VALUES
  (5, 'Répétiteur scolaire',    'Private Tutor',     'Janngirɗo Suɗe',    'repetiteur',   1),
  (5, 'Formateur informatique', 'IT Trainer',        'Janngirɗo Ordinateer','formateur-info',2),
  (5, 'Alphabétisation',        'Literacy Training', 'Janngugol Windugol', 'alphabetisation',3),
  (5, 'Formation professionnelle','Vocational Training','Janngugol Gollorɗe','formation-pro',4);

-- SOUS-CATÉGORIES — Alimentation & Traiteur (parent 6)
INSERT INTO categories (parent_id, name_fr, name_en, name_ful, slug, sort_order) VALUES
  (6, 'Traiteur événementiel',  'Event Caterer',     'Nyaamooɗo Fete',     'traiteur',     1),
  (6, 'Boulanger / Pâtissier',  'Baker / Pastry Chef','Burgooɗo Mburu',    'boulanger',    2),
  (6, 'Vendeur de légumes',     'Vegetable Seller',  'Yahdoowo Leɗɗe',     'vendeur-legumes',3);
