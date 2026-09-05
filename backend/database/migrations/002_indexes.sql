-- ================================================================
-- ADMA — Index supplémentaires pour les performances
-- ================================================================

-- Index pour les recherches fréquentes
ALTER TABLE providers ADD INDEX idx_prov_avail_city (availability, city_id, is_active);
ALTER TABLE providers ADD INDEX idx_prov_plan_expires (plan, plan_expires_at);

-- Index pour les stats
ALTER TABLE contact_events ADD INDEX idx_ce_month (created_at, event_type);

-- Index notifications
ALTER TABLE notifications ADD INDEX idx_notif_sent (sent_at, user_id);
ALTER TABLE notifications ADD INDEX idx_notif_type (type, created_at);

-- Index paiements
ALTER TABLE payments ADD INDEX idx_pay_created (created_at, status);
