-- ADMA — Migration fidélité tarifaire
ALTER TABLE providers
  ADD COLUMN loyalty_months TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER plan_expires_at,
  ADD COLUMN last_renewal_at TIMESTAMP NULL DEFAULT NULL AFTER loyalty_months;

ALTER TABLE subscriptions
  ADD COLUMN base_amount INT UNSIGNED NULL DEFAULT NULL AFTER amount,
  ADD COLUMN discount_percent TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER base_amount;

ALTER TABLE payments
  ADD COLUMN plan_intent ENUM('premium','professional','enterprise') NULL DEFAULT NULL AFTER provider_id;

ALTER TABLE providers
  ADD INDEX idx_prov_expires (plan_expires_at, plan, is_active);
