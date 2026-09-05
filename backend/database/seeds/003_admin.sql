-- ================================================================
-- ADMA — Seed Admin initial
-- IMPORTANT : Changer le mot de passe immediatement apres import
-- Hash bcrypt de "AdmaAdmin2025!" (12 rounds)
-- ================================================================

-- Générer un nouveau hash avec :
-- node -e "const b=require('bcryptjs');b.hash('VotreMotDePasse',12).then(console.log)"

INSERT INTO admins (email, password_hash, full_name, is_active) VALUES (
  'admin@adma.cm',
  '$2a$12$placeholder_remplacer_par_vrai_hash_bcrypt',
  'Administrateur Adma',
  TRUE
);
