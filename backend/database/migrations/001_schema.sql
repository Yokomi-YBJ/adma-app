-- ============================================================
-- ADMA — Schéma de base de données v1.0
-- MySQL 8.0+ / TiDB Cloud compatible
-- Auteur : Yokomi Beyea Josaphat
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- VILLES
-- ------------------------------------------------------------
CREATE TABLE cities (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)     NOT NULL,
  region      VARCHAR(100)     NOT NULL DEFAULT 'Adamaoua',
  is_active   BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cities_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- QUARTIERS
-- ------------------------------------------------------------
CREATE TABLE neighborhoods (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  city_id     TINYINT UNSIGNED  NOT NULL,
  name        VARCHAR(150)      NOT NULL,
  is_active   BOOLEAN           NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_neigh_city_name (city_id, name),
  KEY         idx_neigh_city (city_id),
  CONSTRAINT fk_neigh_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- UTILISATEURS
-- ------------------------------------------------------------
CREATE TABLE users (
  id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  phone           VARCHAR(20)      NOT NULL,
  phone_verified  BOOLEAN          NOT NULL DEFAULT FALSE,
  first_name      VARCHAR(80)      NOT NULL DEFAULT '',
  last_name       VARCHAR(80)      NOT NULL DEFAULT '',
  avatar_url      VARCHAR(500)          NULL DEFAULT NULL,
  cloudinary_id   VARCHAR(200)          NULL DEFAULT NULL,
  phone_public    BOOLEAN          NOT NULL DEFAULT FALSE,
  status          ENUM('active','suspended','deleted') NOT NULL DEFAULT 'active',
  expo_push_token VARCHAR(200)          NULL DEFAULT NULL,
  last_seen_at    TIMESTAMP             NULL DEFAULT NULL,
  created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone (phone),
  KEY         idx_users_status (status),
  KEY         idx_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- CODES OTP
-- ------------------------------------------------------------
CREATE TABLE otp_codes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone       VARCHAR(20)     NOT NULL,
  code_hash   VARCHAR(255)    NOT NULL,
  attempts    TINYINT         NOT NULL DEFAULT 0,
  expires_at  TIMESTAMP       NOT NULL,
  used_at     TIMESTAMP            NULL DEFAULT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY         idx_otp_phone_expires (phone, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- REFRESH TOKENS
-- ------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255)    NOT NULL,
  device_info VARCHAR(300)         NULL DEFAULT NULL,
  expires_at  TIMESTAMP       NOT NULL,
  revoked_at  TIMESTAMP            NULL DEFAULT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY         idx_rt_user (user_id),
  KEY         idx_rt_hash (token_hash(50)),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- CATÉGORIES
-- ------------------------------------------------------------
CREATE TABLE categories (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id   TINYINT UNSIGNED      NULL DEFAULT NULL,
  name_fr     VARCHAR(120)     NOT NULL,
  name_en     VARCHAR(120)     NOT NULL,
  name_ful    VARCHAR(120)     NOT NULL DEFAULT '',
  slug        VARCHAR(120)     NOT NULL,
  icon        VARCHAR(80)           NULL DEFAULT NULL,
  sort_order  TINYINT          NOT NULL DEFAULT 0,
  is_active   BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY         idx_cat_parent (parent_id),
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- FICHES PRESTATAIRES
-- ------------------------------------------------------------
CREATE TABLE providers (
  id                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED  NOT NULL,
  category_id       TINYINT UNSIGNED NOT NULL,
  name              VARCHAR(150)     NOT NULL,
  specialty         VARCHAR(200)          NULL DEFAULT NULL,
  description       TEXT                  NULL DEFAULT NULL,
  city_id           TINYINT UNSIGNED NOT NULL,
  neighborhood_id   SMALLINT UNSIGNED NOT NULL,
  phone_number      VARCHAR(20)           NULL DEFAULT NULL,
  whatsapp_number   VARCHAR(20)           NULL DEFAULT NULL,
  contact_method    ENUM('phone','whatsapp','both') NOT NULL DEFAULT 'both',
  photo_url         VARCHAR(500)          NULL DEFAULT NULL,
  cloudinary_id     VARCHAR(200)          NULL DEFAULT NULL,
  website_url       VARCHAR(300)          NULL DEFAULT NULL,
  availability      ENUM('available','busy','unavailable') NOT NULL DEFAULT 'available',
  hours_json        JSON                  NULL DEFAULT NULL,
  -- Vérification
  verification_status ENUM('none','pending','verified_id','verified') NOT NULL DEFAULT 'none',
  verified_at       TIMESTAMP             NULL DEFAULT NULL,
  -- Abonnement
  plan              ENUM('free','premium','professional','enterprise') NOT NULL DEFAULT 'free',
  plan_expires_at   TIMESTAMP             NULL DEFAULT NULL,
  -- Scores (dénormalisés pour la perf, mis à jour par trigger)
  review_count      INT UNSIGNED     NOT NULL DEFAULT 0,
  recommend_count   INT UNSIGNED     NOT NULL DEFAULT 0,
  trust_score       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  -- Classement
  ranking_score     FLOAT            NOT NULL DEFAULT 0,
  -- Etat
  is_active         BOOLEAN          NOT NULL DEFAULT TRUE,
  suspended_at      TIMESTAMP             NULL DEFAULT NULL,
  deleted_at        TIMESTAMP             NULL DEFAULT NULL,
  created_at        TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_providers_user (user_id),
  KEY idx_prov_category    (category_id),
  KEY idx_prov_city_neigh  (city_id, neighborhood_id),
  KEY idx_prov_ranking     (ranking_score DESC, is_active),
  KEY idx_prov_trust       (trust_score DESC),
  KEY idx_prov_plan        (plan),
  KEY idx_prov_active_cat  (is_active, category_id, ranking_score),
  CONSTRAINT fk_prov_user  FOREIGN KEY (user_id)          REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT fk_prov_cat   FOREIGN KEY (category_id)      REFERENCES categories(id)    ON DELETE RESTRICT,
  CONSTRAINT fk_prov_city  FOREIGN KEY (city_id)          REFERENCES cities(id)        ON DELETE RESTRICT,
  CONSTRAINT fk_prov_neigh FOREIGN KEY (neighborhood_id)  REFERENCES neighborhoods(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- PHOTOS DE GALERIE (Premium)
-- ------------------------------------------------------------
CREATE TABLE provider_photos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id   BIGINT UNSIGNED NOT NULL,
  photo_url     VARCHAR(500)    NOT NULL,
  cloudinary_id VARCHAR(200)    NOT NULL,
  caption       VARCHAR(200)         NULL DEFAULT NULL,
  position      TINYINT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_photos_provider (provider_id, position),
  CONSTRAINT fk_photos_prov FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- DEMANDES DE VÉRIFICATION
-- ------------------------------------------------------------
CREATE TABLE verification_requests (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id     BIGINT UNSIGNED NOT NULL,
  cni_front_url   VARCHAR(500)    NOT NULL,
  cni_back_url    VARCHAR(500)         NULL DEFAULT NULL,
  cni_front_cld   VARCHAR(200)    NOT NULL,
  cni_back_cld    VARCHAR(200)         NULL DEFAULT NULL,
  message         TEXT                 NULL DEFAULT NULL,
  status          ENUM('pending','reviewing','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by     BIGINT UNSIGNED      NULL DEFAULT NULL,
  reviewed_at     TIMESTAMP            NULL DEFAULT NULL,
  review_note     TEXT                 NULL DEFAULT NULL,
  -- Suppression auto des CNI après certification
  cni_deleted_at  TIMESTAMP            NULL DEFAULT NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vreq_provider (provider_id),
  KEY idx_vreq_status   (status),
  CONSTRAINT fk_vreq_prov FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- AVIS
-- ------------------------------------------------------------
CREATE TABLE reviews (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id BIGINT UNSIGNED NOT NULL,
  reviewer_id BIGINT UNSIGNED NOT NULL,
  verdict     ENUM('recommend','neutral','discourage') NOT NULL,
  comment     VARCHAR(500)         NULL DEFAULT NULL,
  status      ENUM('active','hidden','deleted') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_pair (provider_id, reviewer_id),
  KEY idx_reviews_provider (provider_id, status, created_at DESC),
  KEY idx_reviews_reviewer (reviewer_id),
  CONSTRAINT fk_rev_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- RÉPONSES AUX AVIS
-- ------------------------------------------------------------
CREATE TABLE review_responses (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  review_id   BIGINT UNSIGNED NOT NULL,
  provider_id BIGINT UNSIGNED NOT NULL,
  comment     VARCHAR(500)    NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rresp_review (review_id),
  KEY         idx_rresp_provider (provider_id),
  CONSTRAINT fk_rresp_review FOREIGN KEY (review_id)   REFERENCES reviews(id)   ON DELETE CASCADE,
  CONSTRAINT fk_rresp_prov   FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- FAVORIS
-- ------------------------------------------------------------
CREATE TABLE favorites (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  provider_id BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fav_pair (user_id, provider_id),
  KEY         idx_fav_user     (user_id),
  KEY         idx_fav_provider (provider_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  CONSTRAINT fk_fav_prov FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- ÉVÉNEMENTS DE CONTACT
-- ------------------------------------------------------------
CREATE TABLE contact_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED      NULL DEFAULT NULL,
  event_type  ENUM('profile_view','phone_click','whatsapp_click') NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ce_provider_type  (provider_id, event_type, created_at),
  KEY idx_ce_provider_month (provider_id, created_at),
  CONSTRAINT fk_ce_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- SIGNALEMENTS
-- ------------------------------------------------------------
CREATE TABLE reports (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id BIGINT UNSIGNED NOT NULL,
  target_type ENUM('provider','review') NOT NULL,
  target_id   BIGINT UNSIGNED NOT NULL,
  reason      ENUM(
    'fake_provider','wrong_number','wrong_info',
    'activity_not_exist','problematic_behavior',
    'fake_review','offensive','defamation','spam','other'
  ) NOT NULL,
  description TEXT                 NULL DEFAULT NULL,
  status      ENUM('pending','reviewing','resolved','dismissed') NOT NULL DEFAULT 'pending',
  resolved_by BIGINT UNSIGNED      NULL DEFAULT NULL,
  resolved_at TIMESTAMP            NULL DEFAULT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rep_reporter    (reporter_id),
  KEY idx_rep_target      (target_type, target_id),
  KEY idx_rep_status      (status),
  CONSTRAINT fk_rep_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- ABONNEMENTS
-- ------------------------------------------------------------
CREATE TABLE subscriptions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_id     BIGINT UNSIGNED NOT NULL,
  plan            ENUM('premium','professional','enterprise') NOT NULL,
  amount          INT UNSIGNED    NOT NULL,
  start_date      DATE            NOT NULL,
  end_date        DATE            NOT NULL,
  status          ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  activated_by    ENUM('payment','admin') NOT NULL DEFAULT 'payment',
  activated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at    TIMESTAMP            NULL DEFAULT NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sub_provider (provider_id, status),
  KEY idx_sub_end_date (end_date, status),
  CONSTRAINT fk_sub_prov FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- PAIEMENTS
-- ------------------------------------------------------------
CREATE TABLE payments (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subscription_id       BIGINT UNSIGNED      NULL DEFAULT NULL,
  provider_id           BIGINT UNSIGNED NOT NULL,
  kpay_payment_id       VARCHAR(100)         NULL DEFAULT NULL,
  kpay_reference        VARCHAR(100)         NULL DEFAULT NULL,
  kpay_external_id      VARCHAR(100)         NULL DEFAULT NULL,
  amount                INT UNSIGNED    NOT NULL,
  currency              VARCHAR(5)      NOT NULL DEFAULT 'XAF',
  mobile_operator       ENUM('orange_cmr','mtn_momo_cmr') NULL DEFAULT NULL,
  phone_number          VARCHAR(20)          NULL DEFAULT NULL,
  status                ENUM('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  failure_reason        VARCHAR(300)         NULL DEFAULT NULL,
  webhook_received_at   TIMESTAMP            NULL DEFAULT NULL,
  created_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pay_external (kpay_external_id),
  KEY idx_pay_provider   (provider_id),
  KEY idx_pay_status     (status),
  KEY idx_pay_kpay_id    (kpay_payment_id),
  CONSTRAINT fk_pay_sub  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
  CONSTRAINT fk_pay_prov FOREIGN KEY (provider_id)     REFERENCES providers(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- ADMINS
-- ------------------------------------------------------------
CREATE TABLE admins (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  email           VARCHAR(150)  NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  full_name       VARCHAR(150)  NOT NULL,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMP          NULL DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- OTP ADMINS (via Resend)
-- ------------------------------------------------------------
CREATE TABLE admin_otp_codes (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  admin_id    INT UNSIGNED  NOT NULL,
  code_hash   VARCHAR(255)  NOT NULL,
  expires_at  TIMESTAMP     NOT NULL,
  used_at     TIMESTAMP          NULL DEFAULT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_aotp_admin (admin_id, expires_at),
  CONSTRAINT fk_aotp_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- LOGS D'ACTIONS ADMIN
-- ------------------------------------------------------------
CREATE TABLE admin_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id    INT UNSIGNED    NOT NULL,
  action      VARCHAR(100)    NOT NULL,
  target_type VARCHAR(50)          NULL DEFAULT NULL,
  target_id   BIGINT UNSIGNED      NULL DEFAULT NULL,
  details     JSON                 NULL DEFAULT NULL,
  ip_address  VARCHAR(45)          NULL DEFAULT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_alog_admin  (admin_id),
  KEY idx_alog_action (action, created_at),
  CONSTRAINT fk_alog_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  type        VARCHAR(60)     NOT NULL,
  title_fr    VARCHAR(200)    NOT NULL,
  title_en    VARCHAR(200)         NULL DEFAULT NULL,
  body_fr     VARCHAR(400)    NOT NULL,
  body_en     VARCHAR(400)         NULL DEFAULT NULL,
  data_json   JSON                 NULL DEFAULT NULL,
  is_read     BOOLEAN         NOT NULL DEFAULT FALSE,
  sent_at     TIMESTAMP            NULL DEFAULT NULL,
  read_at     TIMESTAMP            NULL DEFAULT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user_read (user_id, is_read, created_at DESC),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- PRÉFÉRENCES NOTIFICATIONS UTILISATEURS
-- ------------------------------------------------------------
CREATE TABLE notification_preferences (
  user_id               BIGINT UNSIGNED NOT NULL,
  new_review            BOOLEAN NOT NULL DEFAULT TRUE,
  review_response       BOOLEAN NOT NULL DEFAULT TRUE,
  verification_update   BOOLEAN NOT NULL DEFAULT TRUE,
  subscription_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  favorite_update       BOOLEAN NOT NULL DEFAULT TRUE,
  contact_reminder      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_np_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TRIGGERS — Mise à jour automatique trust_score + ranking
-- ============================================================

DELIMITER $$

-- Après insertion d'un avis
CREATE TRIGGER trg_review_after_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE providers SET
      review_count    = review_count + 1,
      recommend_count = recommend_count + IF(NEW.verdict = 'recommend', 1, 0),
      trust_score     = ROUND(
        (recommend_count + IF(NEW.verdict = 'recommend', 1, 0)) /
        (review_count + 1) * 100
      ),
      ranking_score   = (
        (trust_score / 100) * 40 +
        LEAST(review_count + 1, 100) / 100 * 20 +
        IF(verification_status = 'verified', 15, IF(verification_status = 'verified_id', 8, 0)) +
        IF(photo_url IS NOT NULL AND description IS NOT NULL AND specialty IS NOT NULL, 10, 5) +
        IF(plan IN ('premium','professional','enterprise'), 10, 0) +
        5
      )
    WHERE id = NEW.provider_id;
  END IF;
END$$

-- Après mise à jour d'un avis
CREATE TRIGGER trg_review_after_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
  -- Recalcul complet depuis les données réelles
  UPDATE providers p
  SET
    review_count    = (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active'),
    recommend_count = (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active' AND r.verdict = 'recommend'),
    trust_score     = ROUND(
      IFNULL(
        (SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active' AND r.verdict = 'recommend') /
        NULLIF((SELECT COUNT(*) FROM reviews r WHERE r.provider_id = p.id AND r.status = 'active'), 0) * 100,
        0
      )
    )
  WHERE id = NEW.provider_id;
END$$

DELIMITER ;

-- ============================================================
-- INDEX FULL-TEXT pour la recherche
-- ============================================================
ALTER TABLE providers
  ADD FULLTEXT KEY ft_prov_search (name, specialty, description);

ALTER TABLE categories
  ADD FULLTEXT KEY ft_cat_search (name_fr, name_en);

SET FOREIGN_KEY_CHECKS = 1;
