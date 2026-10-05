-- ============================================================
-- ADMA — Table des campagnes de notifications admin
-- ============================================================

CREATE TABLE admin_broadcasts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id        INT UNSIGNED    NOT NULL,

  -- Contenu (multilingue)
  title_fr        VARCHAR(200)    NOT NULL,
  title_en        VARCHAR(200)    NULL DEFAULT NULL,
  title_ful       VARCHAR(200)    NULL DEFAULT NULL,
  body_fr         VARCHAR(500)    NOT NULL,
  body_en         VARCHAR(500)    NULL DEFAULT NULL,
  body_ful        VARCHAR(500)    NULL DEFAULT NULL,

  -- Type de message
  type            ENUM('ad','promo','announcement','info','important')
                  NOT NULL DEFAULT 'info',

  -- Cible
  target_type     ENUM('all','providers','plan','category')
                  NOT NULL DEFAULT 'all',
  target_value    VARCHAR(100)    NULL DEFAULT NULL,

  -- Cycle de vie
  status          ENUM('draft','scheduled','sending','sent','failed')
                  NOT NULL DEFAULT 'draft',
  scheduled_at    TIMESTAMP       NULL DEFAULT NULL,
  sent_at         TIMESTAMP       NULL DEFAULT NULL,
  recipients_count INT UNSIGNED   NOT NULL DEFAULT 0,
  failed_count    INT UNSIGNED    NOT NULL DEFAULT 0,
  error_message   VARCHAR(300)    NULL DEFAULT NULL,

  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_bc_status_sched (status, scheduled_at),
  KEY idx_bc_admin        (admin_id, created_at DESC),
  CONSTRAINT fk_bc_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
