-- ================================================================
-- ADMA — Migration 003 : Géolocalisation prestataires
-- ================================================================

ALTER TABLE providers
  ADD COLUMN latitude          DECIMAL(10, 7)  NULL DEFAULT NULL AFTER neighborhood_id,
  ADD COLUMN longitude         DECIMAL(10, 7)  NULL DEFAULT NULL AFTER latitude,
  ADD COLUMN geo_updated_at    TIMESTAMP       NULL DEFAULT NULL AFTER longitude,
  ADD INDEX  idx_prov_geo      (latitude, longitude);

-- Vue utilitaire : rayon de détectabilité par plan (en km)
-- free=3 | premium=6 | professional=9 | enterprise=illimité (99999)
