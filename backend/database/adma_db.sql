-- ============================================================
-- ADMA — Base de données compatible TiDB Cloud
-- Nettoyage automatique :
--   ✂ Triggers supprimés (TiDB ne les supporte pas)
--   ✂ FULLTEXT indexes supprimés (TiDB ne les supporte pas en écriture)
--   ✂ CHECK (json_valid) supprimés (validation côté app)
--   ✅ Recalcul des scores reviews → fait dans reviewController.js
--
-- Mise à jour 12/10/2026 :
--   + providers.pending_plan_change       (downgrade différé)
--   + providers.pending_plan_effective_at (date effective)
--   + index idx_pending_plan
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `adma_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `adma_db`;

-- ------------------------------------------------------------
-- TABLE : admins
-- ------------------------------------------------------------
CREATE TABLE `admins` (
  `id` int(10) UNSIGNED NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admins` (`id`, `email`, `password_hash`, `full_name`, `is_active`, `last_login_at`, `created_at`) VALUES
(1, 'beyeayokomi@gmail.com', '$2a$12$DdKre50B70rxk81eegWwn.7qY1vu5Ixv4VpQ3r0idkC/U1ADHY3hK', 'Yokomi Beyea', 1, '2026-10-07 10:26:22', '2026-09-30 14:39:41');

-- ------------------------------------------------------------
-- TABLE : admin_broadcasts
-- ------------------------------------------------------------
CREATE TABLE `admin_broadcasts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `admin_id` int(10) UNSIGNED NOT NULL,
  `title_fr` varchar(200) NOT NULL,
  `title_en` varchar(200) DEFAULT NULL,
  `title_ful` varchar(200) DEFAULT NULL,
  `body_fr` varchar(500) NOT NULL,
  `body_en` varchar(500) DEFAULT NULL,
  `body_ful` varchar(500) DEFAULT NULL,
  `type` enum('ad','promo','announcement','info','important') NOT NULL DEFAULT 'info',
  `target_type` enum('all','providers','plan','category') NOT NULL DEFAULT 'all',
  `target_value` varchar(100) DEFAULT NULL,
  `status` enum('draft','scheduled','sending','sent','failed') NOT NULL DEFAULT 'draft',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `recipients_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `failed_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `error_message` varchar(300) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admin_broadcasts` (`id`, `admin_id`, `title_fr`, `title_en`, `title_ful`, `body_fr`, `body_en`, `body_ful`, `type`, `target_type`, `target_value`, `status`, `scheduled_at`, `sent_at`, `recipients_count`, `failed_count`, `error_message`, `created_at`, `updated_at`) VALUES
(1, 1, 'Adma arrive bientôt', 'Adma arrive bientôt', 'Adma arrive bientôt', 'Bonjour,\n\nNous sommes heureux de vous annoncer que l''application Adma sera bientôt disponible à Ngaoundéré et dans toute la région de l''Adamaoua.\n\nVous pourrez bientôt découvrir et contacter directement les meilleurs prestataires de votre quartier, consulter leurs avis vérifiés, et profiter de nos services en toute simplicité.\n\nRestez connectés, nous vous préviendrons dès le lancement officiel.', 'Bonjour,\n\nNous sommes heureux de vous annoncer que l''application Adma sera bientôt disponible à Ngaoundéré et dans toute la région de l''Adamaoua.\n\nVous pourrez bientôt découvrir et contacter directement les meilleurs prestataires de votre quartier, consulter leurs avis vérifiés, et profiter de nos services en toute simplicité.\n\nRestez connectés, nous vous préviendrons dès le lancement officiel.', 'Bonjour,\n\nNous sommes heureux de vous annoncer que l''application Adma sera bientôt disponible à Ngaoundéré et dans toute la région de l''Adamaoua.\n\nVous pourrez bientôt découvrir et contacter directement les meilleurs prestataires de votre quartier, consulter leurs avis vérifiés, et profiter de nos services en toute simplicité.\n\nRestez connectés, nous vous préviendrons dès le lancement officiel.', 'info', 'all', NULL, 'sending', NULL, NULL, 0, 0, NULL, '2026-10-05 20:27:41', '2026-10-05 20:27:41');

-- ------------------------------------------------------------
-- TABLE : admin_logs
-- ------------------------------------------------------------
CREATE TABLE `admin_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `admin_id` int(10) UNSIGNED NOT NULL,
  `action` varchar(100) NOT NULL,
  `target_type` varchar(50) DEFAULT NULL,
  `target_id` bigint(20) UNSIGNED DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admin_logs` (`id`, `admin_id`, `action`, `target_type`, `target_id`, `details`, `ip_address`, `created_at`) VALUES
(1, 1, 'login', NULL, NULL, NULL, NULL, '2026-10-01 07:35:36'),
(2, 1, 'verification_approve', 'provider', 1, '{\"badgeType\":\"verified_id\"}', NULL, '2026-10-01 07:57:37'),
(3, 1, 'provider_update', 'provider', 1, '{\"name\":\"OmiTech\",\"specialty\":\"Développement logiciel\",\"plan\":\"free\",\"verification_status\":\"verified\",\"is_active\":1}', NULL, '2026-10-01 08:21:14'),
(4, 1, 'provider_update', 'provider', 1, '{\"name\":\"OmiTech\",\"specialty\":\"Développement logiciel\",\"plan\":\"enterprise\",\"verification_status\":\"verified\",\"is_active\":1}', NULL, '2026-10-01 08:23:38'),
(5, 1, 'report_resolve', 'report', 1, '{\"note\":\"Avis supprimé\"}', NULL, '2026-10-01 09:46:25'),
(6, 1, 'review_hide', 'review', 1, NULL, NULL, '2026-10-01 09:46:46'),
(7, 1, 'review_restore', 'review', 1, NULL, NULL, '2026-10-01 09:47:02'),
(8, 1, 'login', NULL, NULL, NULL, NULL, '2026-10-05 17:13:18'),
(9, 1, 'verification_approve', 'provider', 2, '{\"badgeType\":\"verified_id\"}', NULL, '2026-10-05 17:14:36'),
(10, 1, 'login', NULL, NULL, NULL, NULL, '2026-10-05 17:29:09'),
(11, 1, 'login', NULL, NULL, NULL, NULL, '2026-10-05 19:22:40'),
(12, 1, 'login', NULL, NULL, NULL, NULL, '2026-10-05 20:15:41'),
(13, 1, 'broadcast_notification', 'broadcast', 1, '{\"titleFr\":\"Adma arrive bientôt\",\"type\":\"info\",\"targetType\":\"all\",\"targetValue\":null,\"scheduled\":false}', NULL, '2026-10-05 20:27:41'),
(14, 1, 'login', NULL, NULL, NULL, NULL, '2026-10-07 09:57:52'),
(15, 1, 'verification_reject', 'provider', 3, '{\"reason\":\"photo flou\"}', NULL, '2026-10-07 10:02:02'),
(16, 1, 'login', NULL, NULL, NULL, NULL, '2026-10-07 10:26:22'),
(17, 1, 'error', 'server', NULL, '{\"path\":\"/api/v1/users/avatar\",\"code\":null,\"message\":\"Cloudinary : Erreur inconnue\",\"user\":1}', NULL, '2026-10-08 12:42:41'),
(18, 1, 'error', 'server', NULL, '{\"path\":\"/api/v1/payments/initiate\",\"code\":null,\"message\":\"fetch failed\",\"user\":1}', NULL, '2026-10-08 12:51:51');

-- ------------------------------------------------------------
-- TABLE : admin_otp_codes
-- ------------------------------------------------------------
CREATE TABLE `admin_otp_codes` (
  `id` int(10) UNSIGNED NOT NULL,
  `admin_id` int(10) UNSIGNED NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admin_otp_codes` (`id`, `admin_id`, `code_hash`, `expires_at`, `used_at`, `created_at`) VALUES
(17, 1, '$2a$10$fJBM7uhEo/rBZLS0WwAj4.rzqwyzgkSYCGZA6MJYOOuut5avdEGQ6', '2026-10-07 10:36:22', '2026-10-07 10:26:22', '2026-10-07 10:25:56');

-- ------------------------------------------------------------
-- TABLE : cities
-- ------------------------------------------------------------
CREATE TABLE `cities` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `region` varchar(100) NOT NULL DEFAULT 'Adamaoua',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `cities` (`id`, `name`, `region`, `is_active`, `created_at`) VALUES
(1, 'Ngaoundéré 1er', 'Adamaoua', 1, '2026-09-30 14:39:12'),
(2, 'Ngaoundéré 2e', 'Adamaoua', 1, '2026-09-30 14:39:12'),
(3, 'Ngaoundéré 3e', 'Adamaoua', 1, '2026-09-30 14:39:12');

-- ------------------------------------------------------------
-- TABLE : neighborhoods
-- ------------------------------------------------------------
CREATE TABLE `neighborhoods` (
  `id` smallint(5) UNSIGNED NOT NULL,
  `city_id` tinyint(3) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `neighborhoods` (`id`, `city_id`, `name`, `is_active`, `created_at`) VALUES
(1, 1, 'Quartier Administratif', 1, '2026-09-30 14:39:12'),
(2, 1, 'Mbideng', 1, '2026-09-30 14:39:12'),
(3, 1, 'Camp Fonctionnaire', 1, '2026-09-30 14:39:12'),
(4, 1, 'Ndelbé', 1, '2026-09-30 14:39:12'),
(5, 1, 'Bali', 1, '2026-09-30 14:39:12'),
(6, 1, 'Boumdjéré', 1, '2026-09-30 14:39:12'),
(7, 1, 'Mission Catholique', 1, '2026-09-30 14:39:12'),
(8, 1, 'Gambara', 1, '2026-09-30 14:39:12'),
(9, 1, 'Mayo-Djarandi', 1, '2026-09-30 14:39:12'),
(10, 1, 'Burkina', 1, '2026-09-30 14:39:12'),
(11, 1, 'Bamyanga', 1, '2026-09-30 14:39:12'),
(12, 1, 'Bamyanga Hamadjangui', 1, '2026-09-30 14:39:12'),
(13, 1, 'Bamyanga Pana', 1, '2026-09-30 14:39:12'),
(14, 1, 'Marza', 1, '2026-09-30 14:39:12'),
(15, 1, 'Ngaoundang', 1, '2026-09-30 14:39:12'),
(16, 1, 'Sioutéré', 1, '2026-09-30 14:39:12'),
(17, 1, 'Laïga', 1, '2026-09-30 14:39:12'),
(18, 1, 'Wakwa', 1, '2026-09-30 14:39:12'),
(19, 1, 'Quartier Lissey', 1, '2026-09-30 14:39:12'),
(20, 1, 'Marma', 1, '2026-09-30 14:39:12'),
(21, 1, 'Haut Plateau', 1, '2026-09-30 14:39:12'),
(22, 1, 'Kantalang', 1, '2026-09-30 14:39:12'),
(23, 1, 'Béka-Hosséré', 1, '2026-09-30 14:39:12'),
(24, 1, 'Mbibackla-Hosséré', 1, '2026-09-30 14:39:12'),
(25, 1, 'Vina-Pont', 1, '2026-09-30 14:39:12'),
(26, 1, 'Falfa', 1, '2026-09-30 14:39:12'),
(27, 1, 'Bondjong', 1, '2026-09-30 14:39:12'),
(28, 1, 'Onaref', 1, '2026-09-30 14:39:12'),
(29, 1, 'Norvégien', 1, '2026-09-30 14:39:12'),
(30, 1, 'Socaret', 1, '2026-09-30 14:39:12'),
(31, 2, 'Baladji', 1, '2026-09-30 14:39:12'),
(32, 2, 'Cifan', 1, '2026-09-30 14:39:12'),
(33, 2, 'Gare Marchandise', 1, '2026-09-30 14:39:12'),
(34, 2, 'Haoussa', 1, '2026-09-30 14:39:12'),
(35, 2, 'Joli Soir', 1, '2026-09-30 14:39:12'),
(36, 2, 'Gada Mabanga', 1, '2026-09-30 14:39:12'),
(37, 2, 'Gada Mabanga-Djalingo', 1, '2026-09-30 14:39:12'),
(38, 2, 'Kormari', 1, '2026-09-30 14:39:12'),
(39, 2, 'Madagascar', 1, '2026-09-30 14:39:12'),
(40, 2, 'Maloumri-Damari', 1, '2026-09-30 14:39:12'),
(41, 2, 'Mbibar', 1, '2026-09-30 14:39:12'),
(42, 2, 'Nord-Cifan', 1, '2026-09-30 14:39:12'),
(43, 2, 'Sabongari', 1, '2026-09-30 14:39:12'),
(44, 2, 'Tongo', 1, '2026-09-30 14:39:12'),
(45, 2, 'Tongo Falingo', 1, '2026-09-30 14:39:12'),
(46, 2, 'Tongo Galdima', 1, '2026-09-30 14:39:12'),
(47, 2, 'Tongo Pastoral', 1, '2026-09-30 14:39:12'),
(48, 2, 'Tongo Seret', 1, '2026-09-30 14:39:12'),
(49, 2, 'Troua Malla', 1, '2026-09-30 14:39:12'),
(50, 2, 'Yarbang', 1, '2026-09-30 14:39:12'),
(51, 2, 'Abattoir', 1, '2026-09-30 14:39:12'),
(52, 2, 'Aéroport', 1, '2026-09-30 14:39:12'),
(53, 2, 'Aoudi', 1, '2026-09-30 14:39:12'),
(54, 2, 'Choa', 1, '2026-09-30 14:39:12'),
(55, 2, 'Lamidat', 1, '2026-09-30 14:39:12'),
(56, 2, 'Mayo-Daneyel', 1, '2026-09-30 14:39:12'),
(57, 2, 'Mbalang-Djalingo', 1, '2026-09-30 14:39:12'),
(58, 2, 'Biskewal', 1, '2026-09-30 14:39:12'),
(59, 2, 'Darang', 1, '2026-09-30 14:39:12'),
(60, 2, 'Dara-Salam', 1, '2026-09-30 14:39:12'),
(61, 2, 'Madem', 1, '2026-09-30 14:39:12'),
(62, 2, 'Margueleng', 1, '2026-09-30 14:39:12'),
(63, 2, 'Massola', 1, '2026-09-30 14:39:12'),
(64, 2, 'Ngaouhora', 1, '2026-09-30 14:39:12'),
(65, 2, 'Ngaoussay', 1, '2026-09-30 14:39:12'),
(66, 2, 'Repyanga', 1, '2026-09-30 14:39:12'),
(67, 2, 'Selbé-Darang', 1, '2026-09-30 14:39:12'),
(68, 2, 'Véla-Mbaï', 1, '2026-09-30 14:39:12'),
(69, 2, 'Yoko-Wouro', 1, '2026-09-30 14:39:12'),
(70, 2, 'Youkou-Mayo-Dana', 1, '2026-09-30 14:39:12'),
(71, 2, 'Mbaouré', 1, '2026-09-30 14:39:12'),
(72, 2, 'Ndougueleng', 1, '2026-09-30 14:39:12'),
(73, 2, 'Vogdjom', 1, '2026-09-30 14:39:12'),
(74, 2, 'Bondjong', 1, '2026-09-30 14:39:12'),
(75, 2, 'Ngaou-Tbala', 1, '2026-09-30 14:39:12'),
(76, 3, 'Bambi', 1, '2026-09-30 14:39:12'),
(77, 3, 'Bini', 1, '2026-09-30 14:39:12'),
(78, 3, 'Dang', 1, '2026-09-30 14:39:12'),
(79, 3, 'Dang Ousmanou', 1, '2026-09-30 14:39:12'),
(80, 3, 'Hore-Bini', 1, '2026-09-30 14:39:12'),
(81, 3, 'Madjele', 1, '2026-09-30 14:39:12'),
(82, 3, 'Malang', 1, '2026-09-30 14:39:12'),
(83, 3, 'Malo-Goni', 1, '2026-09-30 14:39:12'),
(84, 3, 'Malo-Mbifal', 1, '2026-09-30 14:39:12'),
(85, 3, 'Manwi', 1, '2026-09-30 14:39:12'),
(86, 3, 'Margol', 1, '2026-09-30 14:39:12'),
(87, 3, 'Naboune', 1, '2026-09-30 14:39:12'),
(88, 3, 'Gada-Bini', 1, '2026-09-30 14:39:12'),
(89, 3, 'Gada-Bidou', 1, '2026-09-30 14:39:12'),
(90, 3, 'Tchabal-Bambi', 1, '2026-09-30 14:39:12'),
(91, 3, 'Tchabal-Mounguel', 1, '2026-09-30 14:39:12'),
(92, 3, 'Tchabal-Baouro', 1, '2026-09-30 14:39:12'),
(93, 3, 'Tchabal-Djalingo', 1, '2026-09-30 14:39:12'),
(94, 3, 'Malang-Gare', 1, '2026-09-30 14:39:12'),
(95, 3, 'Béka-Ngaoumoukone', 1, '2026-09-30 14:39:12'),
(96, 3, 'Béka-Tinguereng', 1, '2026-09-30 14:39:12'),
(97, 3, 'Ngaoumoukone', 1, '2026-09-30 14:39:12'),
(98, 3, 'Ngodi', 1, '2026-09-30 14:39:12'),
(99, 3, 'Ngodi-Mafal-Ngaou', 1, '2026-09-30 14:39:12'),
(100, 3, 'Ngodi-Maïborno', 1, '2026-09-30 14:39:12'),
(101, 3, 'Saltaka', 1, '2026-09-30 14:39:12'),
(102, 3, 'Tellere', 1, '2026-09-30 14:39:12'),
(103, 3, 'Tinguereng', 1, '2026-09-30 14:39:12'),
(104, 3, 'Wouro-Soua', 1, '2026-09-30 14:39:12'),
(105, 3, 'Roh', 1, '2026-09-30 14:39:12');

-- ------------------------------------------------------------
-- TABLE : users
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `phone` varchar(20) NOT NULL,
  `phone_verified` tinyint(1) NOT NULL DEFAULT 0,
  `first_name` varchar(80) NOT NULL DEFAULT '',
  `last_name` varchar(80) NOT NULL DEFAULT '',
  `avatar_url` varchar(500) DEFAULT NULL,
  `cloudinary_id` varchar(200) DEFAULT NULL,
  `phone_public` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('active','suspended','deleted') NOT NULL DEFAULT 'active',
  `expo_push_token` varchar(200) DEFAULT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `phone`, `phone_verified`, `first_name`, `last_name`, `avatar_url`, `cloudinary_id`, `phone_public`, `status`, `expo_push_token`, `last_seen_at`, `created_at`, `updated_at`) VALUES
(1, '+237691094048', 1, '', 'Beyea Yokomi', 'https://res.cloudinary.com/bxcicl0c/image/upload/v1791359183/adma/users/1/avatar.jpg', 'adma/users/1/avatar', 0, 'active', 'ExponentPushToken[1OdH_ICAPZIoE3_9vnumN1]', '2026-10-08 12:46:32', '2026-10-01 07:49:41', '2026-10-08 12:46:32'),
(2, '+237699000000', 1, '', '', NULL, NULL, 0, 'active', 'ExponentPushToken[1OdH_ICAPZIoE3_9vnumN1]', '2026-10-07 07:49:38', '2026-10-01 07:58:22', '2026-10-07 07:49:38'),
(3, '+237699000001', 1, '', '', NULL, NULL, 0, 'active', NULL, NULL, '2026-10-01 08:30:41', '2026-10-01 08:30:41'),
(4, '+237699000002', 1, '', '', NULL, NULL, 0, 'active', 'ExponentPushToken[1OdH_ICAPZIoE3_9vnumN1]', NULL, '2026-10-01 16:43:29', '2026-10-01 16:43:31'),
(5, '+237698213258', 1, '', '', NULL, NULL, 0, 'active', 'ExponentPushToken[1OdH_ICAPZIoE3_9vnumN1]', '2026-10-05 17:09:49', '2026-10-02 18:52:09', '2026-10-05 17:09:49'),
(6, 'del_6_+237691094018', 1, '', '', NULL, NULL, 0, 'deleted', 'ExponentPushToken[1OdH_ICAPZIoE3_9vnumN1]', '2026-10-05 13:37:35', '2026-10-02 19:02:42', '2026-10-05 13:37:54'),
(7, 'del_7_+237653945342', 1, '', '', NULL, NULL, 0, 'deleted', NULL, NULL, '2026-10-05 13:35:03', '2026-10-05 13:36:51'),
(8, '+237685312532', 1, '', '', NULL, NULL, 0, 'active', 'ExponentPushToken[1OdH_ICAPZIoE3_9vnumN1]', NULL, '2026-10-05 14:28:33', '2026-10-05 14:28:37'),
(9, '+237691085421', 1, '', '', NULL, NULL, 0, 'active', 'ExponentPushToken[1OdH_ICAPZIoE3_9vnumN1]', NULL, '2026-10-05 15:35:10', '2026-10-05 15:35:13'),
(10, '+237693000000', 1, '', '', NULL, NULL, 0, 'active', 'ExponentPushToken[1OdH_ICAPZIoE3_9vnumN1]', '2026-10-07 10:11:55', '2026-10-07 09:19:55', '2026-10-07 10:11:55'),
(11, '+237691094040', 1, '', '', NULL, NULL, 0, 'active', NULL, NULL, '2026-10-08 12:42:10', '2026-10-08 12:42:10');

-- ------------------------------------------------------------
-- TABLE : otp_codes
-- ------------------------------------------------------------
CREATE TABLE `otp_codes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `phone` varchar(20) NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `attempts` tinyint(4) NOT NULL DEFAULT 0,
  `expires_at` datetime NOT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `otp_codes` (`id`, `phone`, `code_hash`, `attempts`, `expires_at`, `used_at`, `created_at`) VALUES
(78, '+237691094048', '$2a$08$D0QLO14i3At/xnnrjlxmZOIl9sP/K.h3lMr/Z7mEsq8IjplurjwsK', 0, '2026-10-08 13:29:22', '2026-10-08 12:19:33', '2026-10-08 12:19:22'),
(79, '+237691094048', '$2a$08$ml4MQGsErM0aYDCMqlyT0Osng.Tb1lqgDvR51fB9HMdYdPTB7U.L6', 0, '2026-10-08 13:47:36', '2026-10-08 12:37:46', '2026-10-08 12:37:37'),
(80, '+237691094048', '$2a$08$.6/A1hyn/4HzoA85HKsa6.6gBd2.u0NtZoPKemgvJkoPh4JecYSIy', 0, '2026-10-08 13:51:59', '2026-10-08 12:46:17', '2026-10-08 12:41:59'),
(81, '+237691094040', '$2a$08$iEy5oQ1qF1fohPqlLmWszOMjqY6lVqjcNKRv7qDM31pWSnHyBDzaa', 0, '2026-10-08 13:52:03', '2026-10-08 12:42:10', '2026-10-08 12:42:03'),
(82, '+237691094048', '$2a$08$dlecWh6fMIeJkXere5IDUudbtLY.Ud0yYn3mzWYZvnuGPHUrRb1ha', 0, '2026-10-08 13:56:18', '2026-10-08 12:46:32', '2026-10-08 12:46:18');

-- ------------------------------------------------------------
-- TABLE : refresh_tokens
-- ------------------------------------------------------------
CREATE TABLE `refresh_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `device_info` varchar(300) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `refresh_tokens` (`id`, `user_id`, `token_hash`, `device_info`, `expires_at`, `revoked_at`, `created_at`) VALUES
(65, 1, '219ac8d3cecf11cbfc75c45a6f16be8db3e2fecd97d3f18d4653043fbb22edf1', 'android', '2026-11-07 12:19:34', '2026-10-08 12:36:24', '2026-10-08 12:19:34'),
(66, 1, 'c16892081e3e913efb7e04bf2c8edabab216d3234c5a387c5712f92abf6adec0', NULL, '2026-11-07 12:36:24', '2026-10-08 12:37:32', '2026-10-08 12:36:24'),
(67, 1, '429161127039ca401ad43a60101ce0eb58936fc3aaac3f493b6d3360c111a4d9', 'android', '2026-11-07 12:37:46', '2026-10-08 12:41:50', '2026-10-08 12:37:46'),
(68, 11, '18c07e3e8cb80c0949868059b30780e40a6273a69e8fa46fd7bcc9db9e3c48e6', 'android', '2026-11-07 12:42:10', '2026-10-08 12:46:11', '2026-10-08 12:42:10'),
(69, 1, '283e65576090e6c034eee7beb4e3ba4f1307436c7f86ce69e7ef0eaacf0b5ad6', 'android', '2026-11-07 12:46:32', NULL, '2026-10-08 12:46:32');

-- ------------------------------------------------------------
-- TABLE : categories
-- ------------------------------------------------------------
CREATE TABLE `categories` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `parent_id` tinyint(3) UNSIGNED DEFAULT NULL,
  `name_fr` varchar(120) NOT NULL,
  `name_en` varchar(120) NOT NULL,
  `name_ful` varchar(120) NOT NULL DEFAULT '',
  `slug` varchar(120) NOT NULL,
  `icon` varchar(80) DEFAULT NULL,
  `sort_order` tinyint(4) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`id`, `parent_id`, `name_fr`, `name_en`, `name_ful`, `slug`, `icon`, `sort_order`, `is_active`, `created_at`) VALUES
(1, NULL, 'Réparation & Technique', 'Repair & Technical', 'Keblugol & Teknik', 'reparation-technique', 'wrench', 1, 1, '2026-09-30 14:39:24'),
(2, NULL, 'Artisanat & Mode', 'Craft & Fashion', 'Tafol & Liggol', 'artisanat-mode', 'scissors', 2, 1, '2026-09-30 14:39:24'),
(3, NULL, 'Construction & Habitat', 'Construction & Housing', 'Galle & Towgol', 'construction-habitat', 'home', 3, 1, '2026-09-30 14:39:24'),
(4, NULL, 'Services quotidiens', 'Daily Services', 'Gollorɗe Hannde', 'services-quotidiens', 'briefcase', 4, 1, '2026-09-30 14:39:24'),
(5, NULL, 'Formation & Éducation', 'Training & Education', 'Janngugol & Suɗe', 'formation-education', 'book-open', 5, 1, '2026-09-30 14:39:24'),
(6, NULL, 'Alimentation & Traiteur', 'Food & Catering', 'Ñamangu & Nyaamoowo', 'alimentation-traiteur', 'utensils', 6, 1, '2026-09-30 14:39:24'),
(7, 1, 'Mécanicien automobile', 'Car Mechanic', 'Mekaniki Moto Mawnde', 'mecanicien-auto', NULL, 1, 1, '2026-09-30 14:39:24'),
(8, 1, 'Mécanicien moto', 'Motorcycle Mechanic', 'Mekaniki Moto', 'mecanicien-moto', NULL, 2, 1, '2026-09-30 14:39:24'),
(9, 1, 'Électricien', 'Electrician', 'Elektrisiyee', 'electricien', NULL, 3, 1, '2026-09-30 14:39:24'),
(10, 1, 'Plombier', 'Plumber', 'Ɓalaaɓe Ndiyam', 'plombier', NULL, 4, 1, '2026-09-30 14:39:24'),
(11, 1, 'Soudeur', 'Welder', 'Soodooɗo Ferel', 'soudeur', NULL, 5, 1, '2026-09-30 14:39:24'),
(12, 1, 'Carrossier', 'Body Shop', 'Carrossiyee', 'carrossier', NULL, 6, 1, '2026-09-30 14:39:24'),
(13, 1, 'Réparateur téléphone', 'Phone Repair', 'Keblooɗo Telefon', 'reparateur-telephone', NULL, 7, 1, '2026-09-30 14:39:24'),
(14, 1, 'Réparateur électroménager', 'Appliance Repair', 'Keblooɗo Elektrik', 'reparateur-electromenager', NULL, 8, 1, '2026-09-30 14:39:24'),
(15, 1, 'Frigoriste', 'Refrigeration Tech', 'Frigoriste', 'frigoriste', NULL, 9, 1, '2026-09-30 14:39:24'),
(16, 1, 'Réparateur informatique', 'Computer Repair', 'Keblooɗo Ordinateer', 'reparateur-informatique', NULL, 10, 1, '2026-09-30 14:39:24'),
(17, 2, 'Couturier / Couturière', 'Tailor', 'Dikiliiɗo', 'couturier', NULL, 1, 1, '2026-09-30 14:39:24'),
(18, 2, 'Brodeur / Brodeuse', 'Embroiderer', 'Brodooɗo', 'brodeur', NULL, 2, 1, '2026-09-30 14:39:24'),
(19, 2, 'Cordonnier', 'Cobbler', 'Saŋkooɗo Yayre', 'cordonnier', NULL, 3, 1, '2026-09-30 14:39:24'),
(20, 2, 'Tailleur traditionnel', 'Traditional Tailor', 'Dikiliiɗo Laaɓal', 'tailleur-trad', NULL, 4, 1, '2026-09-30 14:39:24'),
(21, 2, 'Coiffeur / Coiffeuse', 'Barber / Hairdresser', 'Cefoowo', 'coiffeur', NULL, 5, 1, '2026-09-30 14:39:24'),
(22, 2, 'Tresseur / Tresseuse', 'Braider', 'Tressooɗo', 'tresseur', NULL, 6, 1, '2026-09-30 14:39:24'),
(23, 3, 'Maçon', 'Mason', 'Maason', 'macon', NULL, 1, 1, '2026-09-30 14:39:24'),
(24, 3, 'Peintre', 'Painter', 'Peentooɗo Galle', 'peintre', NULL, 2, 1, '2026-09-30 14:39:24'),
(25, 3, 'Menuisier', 'Carpenter', 'Kaarpitiiyee', 'menuisier', NULL, 3, 1, '2026-09-30 14:39:24'),
(26, 3, 'Carreleur', 'Tiler', 'Karelooɗo', 'carreleur', NULL, 4, 1, '2026-09-30 14:39:24'),
(27, 3, 'Vitrier', 'Glazier', 'Vitooriiɗo', 'vitrier', NULL, 5, 1, '2026-09-30 14:39:24'),
(28, 3, 'Faux-plafonniste', 'Ceiling Installer', 'Foos-plaafooniste', 'faux-plafonniste', NULL, 6, 1, '2026-09-30 14:39:24'),
(29, 4, 'Photographe', 'Photographer', 'Fotograafiiɗo', 'photographe', NULL, 1, 1, '2026-09-30 14:39:24'),
(30, 4, 'Imprimeur', 'Printer', 'Imprimooɗo', 'imprimeur', NULL, 2, 1, '2026-09-30 14:39:24'),
(31, 4, 'Gardien / Agent de sécurité', 'Security Guard', 'Gardiyee', 'gardien', NULL, 3, 1, '2026-09-30 14:39:24'),
(32, 4, 'Laveur de voiture', 'Car Washer', 'Dooɗo Moto Mawnde', 'laveur-voiture', NULL, 4, 1, '2026-09-30 14:39:24'),
(33, 4, 'Livreur', 'Delivery Person', 'Jowiriiɗo', 'livreur', NULL, 5, 1, '2026-09-30 14:39:24'),
(34, 4, 'Déménageur', 'Mover', 'Ummowtooɗo', 'demenageur', NULL, 6, 1, '2026-09-30 14:39:24'),
(35, 5, 'Répétiteur scolaire', 'Private Tutor', 'Janngirɗo Suɗe', 'repetiteur', NULL, 1, 1, '2026-09-30 14:39:25'),
(36, 5, 'Formateur informatique', 'IT Trainer', 'Janngirɗo Ordinateer', 'formateur-info', NULL, 2, 1, '2026-09-30 14:39:25'),
(37, 5, 'Alphabétisation', 'Literacy Training', 'Janngugol Windugol', 'alphabetisation', NULL, 3, 1, '2026-09-30 14:39:25'),
(38, 5, 'Formation professionnelle', 'Vocational Training', 'Janngugol Gollorɗe', 'formation-pro', NULL, 4, 1, '2026-09-30 14:39:25'),
(39, 6, 'Traiteur événementiel', 'Event Caterer', 'Nyaamooɗo Fete', 'traiteur', NULL, 1, 1, '2026-09-30 14:39:25'),
(40, 6, 'Boulanger / Pâtissier', 'Baker / Pastry Chef', 'Burgooɗo Mburu', 'boulanger', NULL, 2, 1, '2026-09-30 14:39:25'),
(41, 6, 'Vendeur de légumes', 'Vegetable Seller', 'Yahdoowo Leɗɗe', 'vendeur-legumes', NULL, 3, 1, '2026-09-30 14:39:25');

-- ------------------------------------------------------------
-- TABLE : providers (✅ MISE À JOUR : downgrade différé)
-- ------------------------------------------------------------
CREATE TABLE `providers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `category_id` tinyint(3) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `specialty` varchar(200) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `city_id` tinyint(3) UNSIGNED NOT NULL,
  `neighborhood_id` smallint(5) UNSIGNED NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `geo_updated_at` timestamp NULL DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `whatsapp_number` varchar(20) DEFAULT NULL,
  `contact_method` enum('phone','whatsapp','both') NOT NULL DEFAULT 'both',
  `photo_url` varchar(500) DEFAULT NULL,
  `cloudinary_id` varchar(200) DEFAULT NULL,
  `website_url` varchar(300) DEFAULT NULL,
  `availability` enum('available','busy','unavailable') NOT NULL DEFAULT 'available',
  `hours_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `verification_status` enum('none','pending','verified_id','verified') NOT NULL DEFAULT 'none',
  `verified_at` timestamp NULL DEFAULT NULL,
  `plan` enum('free','premium','professional','enterprise') NOT NULL DEFAULT 'free',
  `plan_expires_at` timestamp NULL DEFAULT NULL,
  `loyalty_months` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `last_renewal_at` timestamp NULL DEFAULT NULL,
  -- ✅ NOUVELLES COLONNES : downgrade différé
  `pending_plan_change` varchar(20) DEFAULT NULL
    COMMENT 'Plan vers lequel basculer à pending_plan_effective_at',
  `pending_plan_effective_at` date DEFAULT NULL
    COMMENT 'Date à laquelle le changement de plan prend effet',
  -- Colonnes de stats
  `review_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `recommend_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `trust_score` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `ranking_score` float NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `suspended_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `providers` (
  `id`, `user_id`, `category_id`, `name`, `specialty`, `description`,
  `city_id`, `neighborhood_id`, `latitude`, `longitude`, `geo_updated_at`,
  `phone_number`, `whatsapp_number`, `contact_method`,
  `photo_url`, `cloudinary_id`, `website_url`, `availability`, `hours_json`,
  `verification_status`, `verified_at`,
  `plan`, `plan_expires_at`, `loyalty_months`, `last_renewal_at`,
  `pending_plan_change`, `pending_plan_effective_at`,
  `review_count`, `recommend_count`, `trust_score`, `ranking_score`,
  `is_active`, `suspended_at`, `deleted_at`, `created_at`, `updated_at`
) VALUES
(1, 1, 36, 'OmiTech', 'Développement logiciel', 'Je conçois et développe vos applications',
 1, 25, 7.3074926, 13.5623106, '2026-10-02 18:32:05',
 '691094048', '691094048', 'both',
 'https://res.cloudinary.com/bxcicl0c/image/upload/v1790841227/adma/providers/1/profile.jpg', 'adma/providers/1/profile', NULL, 'available', NULL,
 'verified', '2026-10-01 08:23:38',
 'enterprise', NULL, 0, NULL,
 NULL, NULL,
 2, 1, 50, 60.4,
 1, NULL, NULL, '2026-10-01 07:53:47', '2026-10-02 18:32:05'),
(2, 5, 13, 'Boutique 4', 'Réparateur de téléphone', 'Téléphone portable',
 1, 11, 7.4259753, 13.5568872, '2026-10-05 13:46:47',
 '653945342', '653945342', 'both',
 NULL, NULL, NULL, 'available', NULL,
 'verified_id', '2026-10-05 17:14:35',
 'free', NULL, 0, NULL,
 NULL, NULL,
 1, 1, 100, 50.2,
 1, NULL, NULL, '2026-10-02 18:58:07', '2026-10-05 17:14:35'),
(3, 10, 24, '2s peinture', 'Peintre', NULL,
 3, 77, NULL, NULL, NULL,
 '695802238', NULL, 'phone',
 NULL, NULL, NULL, 'available', NULL,
 'none', NULL,
 'free', NULL, 0, NULL,
 NULL, NULL,
 0, 0, 0, 0,
 1, NULL, NULL, '2026-10-07 09:32:46', '2026-10-07 10:02:02');

-- ------------------------------------------------------------
-- TABLE : provider_photos
-- ------------------------------------------------------------
CREATE TABLE `provider_photos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `provider_id` bigint(20) UNSIGNED NOT NULL,
  `photo_url` varchar(500) NOT NULL,
  `cloudinary_id` varchar(200) NOT NULL,
  `caption` varchar(200) DEFAULT NULL,
  `position` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABLE : verification_requests
-- ------------------------------------------------------------
CREATE TABLE `verification_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `provider_id` bigint(20) UNSIGNED NOT NULL,
  `cni_front_url` varchar(500) DEFAULT NULL,
  `cni_back_url` varchar(500) DEFAULT NULL,
  `cni_front_cld` varchar(200) DEFAULT NULL,
  `cni_back_cld` varchar(200) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending','reviewing','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_note` text DEFAULT NULL,
  `cni_deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `verification_requests` (`id`, `provider_id`, `cni_front_url`, `cni_back_url`, `cni_front_cld`, `cni_back_cld`, `message`, `status`, `reviewed_by`, `reviewed_at`, `review_note`, `cni_deleted_at`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, NULL, NULL, NULL, NULL, 'approved', 1, '2026-10-01 07:57:36', NULL, '2026-10-05 17:36:58', '2026-10-01 07:55:40', '2026-10-05 17:36:58'),
(2, 2, NULL, NULL, NULL, NULL, NULL, 'approved', 1, '2026-10-05 17:14:35', NULL, '2026-10-07 07:35:32', '2026-10-05 17:11:19', '2026-10-07 07:35:32'),
(3, 3, NULL, NULL, NULL, NULL, NULL, 'rejected', 1, '2026-10-07 10:02:02', 'photo flou', '2026-10-08 12:02:44', '2026-10-07 10:01:08', '2026-10-08 12:02:44');

-- ------------------------------------------------------------
-- TABLE : reviews
-- ------------------------------------------------------------
CREATE TABLE `reviews` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `provider_id` bigint(20) UNSIGNED NOT NULL,
  `reviewer_id` bigint(20) UNSIGNED NOT NULL,
  `verdict` enum('recommend','neutral','discourage') NOT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `status` enum('active','hidden','deleted') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `reviews` (`id`, `provider_id`, `reviewer_id`, `verdict`, `comment`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'recommend', 'Pas mal. Je recommande', 'active', '2026-10-01 07:59:17', '2026-10-01 09:47:01'),
(2, 1, 4, 'discourage', 'C''est un bandit', 'active', '2026-10-01 16:43:53', '2026-10-01 16:43:53'),
(3, 2, 1, 'recommend', 'Très bon artisan', 'active', '2026-10-05 16:59:27', '2026-10-05 16:59:27');

-- ------------------------------------------------------------
-- TABLE : review_responses
-- ------------------------------------------------------------
CREATE TABLE `review_responses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `review_id` bigint(20) UNSIGNED NOT NULL,
  `provider_id` bigint(20) UNSIGNED NOT NULL,
  `comment` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABLE : favorites
-- ------------------------------------------------------------
CREATE TABLE `favorites` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `provider_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `favorites` (`id`, `user_id`, `provider_id`, `created_at`) VALUES
(1, 9, 1, '2026-10-05 15:38:22'),
(2, 2, 1, '2026-10-05 17:45:57'),
(3, 1, 2, '2026-10-07 07:54:44'),
(4, 10, 1, '2026-10-07 09:24:52');

-- ------------------------------------------------------------
-- TABLE : contact_events
-- ------------------------------------------------------------
CREATE TABLE `contact_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `provider_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `event_type` enum('profile_view','phone_click','whatsapp_click') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `contact_events` (`id`, `provider_id`, `user_id`, `event_type`, `created_at`) VALUES
(1, 1, 2, 'profile_view', '2026-10-01 07:58:59'),
(2, 1, 2, 'whatsapp_click', '2026-10-01 09:37:53'),
(3, 1, 2, 'phone_click', '2026-10-01 09:37:59'),
(4, 1, 1, 'profile_view', '2026-10-01 09:48:01'),
(5, 1, 5, 'phone_click', '2026-10-02 18:58:39'),
(6, 1, 1, 'profile_view', '2026-10-02 19:07:04'),
(7, 2, 1, 'phone_click', '2026-10-05 13:34:25'),
(8, 2, 7, 'phone_click', '2026-10-05 13:35:29'),
(9, 1, 2, 'profile_view', '2026-10-05 14:12:36'),
(10, 1, NULL, 'profile_view', '2026-10-05 16:41:50'),
(11, 1, 10, 'profile_view', '2026-10-07 09:25:28'),
(12, 2, 10, 'profile_view', '2026-10-07 09:34:24'),
(13, 1, 1, 'profile_view', '2026-10-08 12:20:52'),
(14, 2, 1, 'whatsapp_click', '2026-10-08 12:36:24'),
(15, 2, 1, 'phone_click', '2026-10-08 12:36:42');

-- ------------------------------------------------------------
-- TABLE : reports
-- ------------------------------------------------------------
CREATE TABLE `reports` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `reporter_id` bigint(20) UNSIGNED NOT NULL,
  `target_type` enum('provider','review') NOT NULL,
  `target_id` bigint(20) UNSIGNED NOT NULL,
  `reason` enum('fake_provider','wrong_number','wrong_info','activity_not_exist','problematic_behavior','fake_review','offensive','defamation','spam','other') NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pending','reviewing','resolved','dismissed') NOT NULL DEFAULT 'pending',
  `resolved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `reports` (`id`, `reporter_id`, `target_type`, `target_id`, `reason`, `description`, `status`, `resolved_by`, `resolved_at`, `created_at`) VALUES
(1, 2, 'provider', 1, 'problematic_behavior', NULL, 'resolved', 1, '2026-10-01 09:46:25', '2026-10-01 09:38:12'),
(2, 10, 'provider', 1, 'wrong_info', NULL, 'pending', NULL, NULL, '2026-10-07 10:12:19'),
(3, 1, 'provider', 2, 'wrong_number', NULL, 'pending', NULL, NULL, '2026-10-08 12:36:57');

-- ------------------------------------------------------------
-- TABLE : subscriptions
-- ------------------------------------------------------------
CREATE TABLE `subscriptions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `provider_id` bigint(20) UNSIGNED NOT NULL,
  `plan` enum('premium','professional','enterprise') NOT NULL,
  `amount` int(10) UNSIGNED NOT NULL,
  `base_amount` int(10) UNSIGNED DEFAULT NULL,
  `discount_percent` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
  `activated_by` enum('payment','admin') NOT NULL DEFAULT 'payment',
  `activated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TABLE : payments
-- ------------------------------------------------------------
CREATE TABLE `payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subscription_id` bigint(20) UNSIGNED DEFAULT NULL,
  `provider_id` bigint(20) UNSIGNED NOT NULL,
  `plan_intent` enum('premium','professional','enterprise') DEFAULT NULL,
  `kpay_payment_id` varchar(100) DEFAULT NULL,
  `kpay_reference` varchar(100) DEFAULT NULL,
  `kpay_external_id` varchar(100) DEFAULT NULL,
  `amount` int(10) UNSIGNED NOT NULL,
  `currency` varchar(5) NOT NULL DEFAULT 'XAF',
  `mobile_operator` enum('orange_cmr','mtn_momo_cmr') DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `status` enum('pending','processing','completed','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `failure_reason` varchar(300) DEFAULT NULL,
  `webhook_received_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `payments` (`id`, `subscription_id`, `provider_id`, `plan_intent`, `kpay_payment_id`, `kpay_reference`, `kpay_external_id`, `amount`, `currency`, `mobile_operator`, `phone_number`, `status`, `failure_reason`, `webhook_received_at`, `created_at`, `updated_at`) VALUES
(1, NULL, 1, 'enterprise', NULL, NULL, 'ADMA-7E5643F8-36C', 7500, 'XAF', 'mtn_momo_cmr', '691094048', 'failed', NULL, NULL, '2026-10-05 13:31:33', '2026-10-05 13:31:35'),
(2, NULL, 1, 'enterprise', NULL, NULL, 'ADMA-4D3880BD-293', 7500, 'XAF', 'orange_cmr', '653130463', 'failed', NULL, NULL, '2026-10-08 12:51:40', '2026-10-08 12:51:51');

-- ------------------------------------------------------------
-- TABLE : notifications
-- ------------------------------------------------------------
CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `type` varchar(60) NOT NULL,
  `title_fr` varchar(200) NOT NULL,
  `title_en` varchar(200) DEFAULT NULL,
  `body_fr` varchar(400) NOT NULL,
  `body_en` varchar(400) DEFAULT NULL,
  `data_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `sent_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title_fr`, `title_en`, `body_fr`, `body_en`, `data_json`, `is_read`, `sent_at`, `read_at`, `created_at`) VALUES
(1, 1, 'verification_approved', 'Vérification approuvée', 'Verification approved', 'Félicitations ! Badge identité vérifiée obtenu.', 'Your verification badge has been granted.', '{}', 1, '2026-10-01 07:57:37', '2026-10-08 12:34:17', '2026-10-01 07:57:37'),
(2, 1, 'new_review', 'Nouvel avis', 'New review', 'Un utilisateur vous a recommandé.', 'Un utilisateur reviewed your profile.', '{\"providerId\":1}', 1, '2026-10-01 07:59:18', '2026-10-08 12:34:16', '2026-10-01 07:59:18'),
(3, 1, 'review_updated', 'Avis modifié', 'Review updated', 'Un utilisateur a modifié son avis (positive → positive).', 'Un utilisateur updated their review.', '{\"providerId\":1}', 1, '2026-10-01 09:37:48', '2026-10-08 12:34:16', '2026-10-01 09:37:48'),
(4, 1, 'new_review', 'Nouvel avis', 'New review', 'Un utilisateur vous a déconseillé.', 'Un utilisateur reviewed your profile.', '{\"providerId\":1}', 1, '2026-10-01 16:43:54', '2026-10-08 12:34:16', '2026-10-01 16:43:54'),
(5, 1, 'new_favorite', 'Nouveau favori', 'New favorite', 'Un utilisateur a ajouté votre fiche à ses favoris.', 'A user added your profile to their favorites.', '{}', 1, '2026-10-05 15:38:22', '2026-10-08 12:34:15', '2026-10-05 15:38:22'),
(6, 5, 'new_review', 'Nouvel avis', 'New review', 'Beyea Yokomi vous a recommandé.', 'Beyea Yokomi reviewed your profile.', '{\"providerId\":2}', 0, '2026-10-05 16:59:28', NULL, '2026-10-05 16:59:28'),
(7, 5, 'verification_approved', 'Vérification approuvée', 'Verification approved', 'Félicitations ! Badge identité vérifiée obtenu.', 'Your verification badge has been granted.', '{}', 0, '2026-10-05 17:14:36', NULL, '2026-10-05 17:14:36'),
(8, 1, 'new_favorite', 'Nouveau favori', 'New favorite', 'Un utilisateur a ajouté votre fiche à ses favoris.', 'A user added your profile to their favorites.', '{}', 1, '2026-10-05 17:45:57', '2026-10-08 12:34:28', '2026-10-05 17:45:57'),
(9, 5, 'new_favorite', 'Nouveau favori', 'New favorite', 'Un utilisateur a ajouté votre fiche à ses favoris.', 'A user added your profile to their favorites.', '{}', 0, '2026-10-07 07:54:44', NULL, '2026-10-07 07:54:44'),
(10, 1, 'new_favorite', 'Nouveau favori', 'New favorite', 'Un utilisateur a ajouté votre fiche à ses favoris.', 'A user added your profile to their favorites.', '{}', 1, '2026-10-07 09:24:52', '2026-10-08 12:34:33', '2026-10-07 09:24:52'),
(11, 10, 'verification_rejected', 'Demande de vérification refusée', 'Verification request rejected', 'photo flou', 'Your request was not approved. Please submit new documents.', '{}', 1, '2026-10-07 10:02:02', '2026-10-07 10:17:05', '2026-10-07 10:02:02');

-- ------------------------------------------------------------
-- TABLE : notification_preferences
-- ------------------------------------------------------------
CREATE TABLE `notification_preferences` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `new_review` tinyint(1) NOT NULL DEFAULT 1,
  `review_response` tinyint(1) NOT NULL DEFAULT 1,
  `verification_update` tinyint(1) NOT NULL DEFAULT 1,
  `subscription_reminder` tinyint(1) NOT NULL DEFAULT 1,
  `favorite_update` tinyint(1) NOT NULL DEFAULT 1,
  `contact_reminder` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `notification_preferences` (`user_id`, `new_review`, `review_response`, `verification_update`, `subscription_reminder`, `favorite_update`, `contact_reminder`, `updated_at`) VALUES
(1, 1, 1, 1, 1, 1, 1, '2026-10-01 07:49:41'),
(2, 1, 1, 1, 1, 1, 1, '2026-10-01 07:58:22'),
(3, 1, 1, 1, 1, 1, 1, '2026-10-01 08:30:42'),
(4, 1, 1, 1, 1, 1, 1, '2026-10-01 16:43:29'),
(5, 1, 1, 1, 1, 1, 1, '2026-10-02 18:52:09'),
(6, 1, 1, 1, 1, 1, 1, '2026-10-02 19:02:42'),
(7, 1, 1, 1, 1, 1, 1, '2026-10-05 13:35:03'),
(8, 1, 1, 1, 1, 1, 1, '2026-10-05 14:28:33'),
(9, 1, 1, 1, 1, 1, 1, '2026-10-05 15:35:10'),
(10, 1, 1, 1, 1, 1, 1, '2026-10-07 09:19:55'),
(11, 1, 1, 1, 1, 1, 1, '2026-10-08 12:42:10');

-- ============================================================
-- INDEXES
-- ============================================================

ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_admin_email` (`email`);

ALTER TABLE `admin_broadcasts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bc_status_sched` (`status`,`scheduled_at`),
  ADD KEY `idx_bc_admin` (`admin_id`,`created_at`);

ALTER TABLE `admin_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_alog_admin` (`admin_id`),
  ADD KEY `idx_alog_action` (`action`,`created_at`);

ALTER TABLE `admin_otp_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aotp_admin` (`admin_id`,`expires_at`);

ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_categories_slug` (`slug`),
  ADD KEY `idx_cat_parent` (`parent_id`);

ALTER TABLE `cities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_cities_name` (`name`);

ALTER TABLE `contact_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ce_provider_type` (`provider_id`,`event_type`,`created_at`),
  ADD KEY `idx_ce_provider_month` (`provider_id`,`created_at`),
  ADD KEY `idx_ce_month` (`created_at`,`event_type`);

ALTER TABLE `favorites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_fav_pair` (`user_id`,`provider_id`),
  ADD KEY `idx_fav_user` (`user_id`),
  ADD KEY `idx_fav_provider` (`provider_id`);

ALTER TABLE `neighborhoods`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_neigh_city_name` (`city_id`,`name`),
  ADD KEY `idx_neigh_city` (`city_id`);

ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notif_user_read` (`user_id`,`is_read`,`created_at`),
  ADD KEY `idx_notif_sent` (`sent_at`,`user_id`),
  ADD KEY `idx_notif_type` (`type`,`created_at`);

ALTER TABLE `notification_preferences`
  ADD PRIMARY KEY (`user_id`);

ALTER TABLE `otp_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_otp_phone_expires` (`phone`,`expires_at`);

ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pay_external` (`kpay_external_id`),
  ADD KEY `idx_pay_provider` (`provider_id`),
  ADD KEY `idx_pay_status` (`status`),
  ADD KEY `idx_pay_kpay_id` (`kpay_payment_id`),
  ADD KEY `fk_pay_sub` (`subscription_id`),
  ADD KEY `idx_pay_created` (`created_at`,`status`);

ALTER TABLE `providers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_providers_user` (`user_id`),
  ADD KEY `idx_prov_category` (`category_id`),
  ADD KEY `idx_prov_city_neigh` (`city_id`,`neighborhood_id`),
  ADD KEY `idx_prov_ranking` (`ranking_score`,`is_active`),
  ADD KEY `idx_prov_trust` (`trust_score`),
  ADD KEY `idx_prov_plan` (`plan`),
  ADD KEY `idx_prov_active_cat` (`is_active`,`category_id`,`ranking_score`),
  ADD KEY `fk_prov_neigh` (`neighborhood_id`),
  ADD KEY `idx_prov_avail_city` (`availability`,`city_id`,`is_active`),
  ADD KEY `idx_prov_plan_expires` (`plan`,`plan_expires_at`),
  ADD KEY `idx_prov_geo` (`latitude`,`longitude`),
  ADD KEY `idx_prov_expires` (`plan_expires_at`,`plan`,`is_active`),
  -- ✅ NOUVEAU INDEX : downgrade différé
  ADD KEY `idx_pending_plan` (`pending_plan_effective_at`,`pending_plan_change`);

ALTER TABLE `provider_photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_photos_provider` (`provider_id`,`position`);

ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rt_user` (`user_id`),
  ADD KEY `idx_rt_hash` (`token_hash`(50));

ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rep_reporter` (`reporter_id`),
  ADD KEY `idx_rep_target` (`target_type`,`target_id`),
  ADD KEY `idx_rep_status` (`status`);

ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_review_pair` (`provider_id`,`reviewer_id`),
  ADD KEY `idx_reviews_provider` (`provider_id`,`status`,`created_at`),
  ADD KEY `idx_reviews_reviewer` (`reviewer_id`);

ALTER TABLE `review_responses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rresp_review` (`review_id`),
  ADD KEY `idx_rresp_provider` (`provider_id`);

ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sub_provider` (`provider_id`,`status`),
  ADD KEY `idx_sub_end_date` (`end_date`,`status`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_phone` (`phone`),
  ADD KEY `idx_users_status` (`status`),
  ADD KEY `idx_users_created` (`created_at`);

ALTER TABLE `verification_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vreq_provider` (`provider_id`),
  ADD KEY `idx_vreq_status` (`status`);

-- ============================================================
-- AUTO INCREMENT
-- ============================================================
ALTER TABLE `admins`                MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `admin_broadcasts`      MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `admin_logs`            MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;
ALTER TABLE `admin_otp_codes`       MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;
ALTER TABLE `categories`            MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;
ALTER TABLE `cities`                MODIFY `id` tinyint(3) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
ALTER TABLE `contact_events`        MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;
ALTER TABLE `favorites`             MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
ALTER TABLE `neighborhoods`         MODIFY `id` smallint(5) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;
ALTER TABLE `notifications`         MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
ALTER TABLE `otp_codes`             MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=83;
ALTER TABLE `payments`              MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
ALTER TABLE `providers`             MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
ALTER TABLE `provider_photos`       MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `refresh_tokens`        MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=70;
ALTER TABLE `reports`               MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
ALTER TABLE `reviews`               MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
ALTER TABLE `review_responses`      MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `subscriptions`         MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `users`                 MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
ALTER TABLE `verification_requests` MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE `admin_broadcasts`
  ADD CONSTRAINT `fk_bc_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`);

ALTER TABLE `admin_logs`
  ADD CONSTRAINT `fk_alog_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`);

ALTER TABLE `admin_otp_codes`
  ADD CONSTRAINT `fk_aotp_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE;

ALTER TABLE `categories`
  ADD CONSTRAINT `fk_cat_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

ALTER TABLE `contact_events`
  ADD CONSTRAINT `fk_ce_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE;

ALTER TABLE `favorites`
  ADD CONSTRAINT `fk_fav_prov` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `neighborhoods`
  ADD CONSTRAINT `fk_neigh_city` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`);

ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `notification_preferences`
  ADD CONSTRAINT `fk_np_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `fk_pay_prov` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pay_sub` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL;

ALTER TABLE `providers`
  ADD CONSTRAINT `fk_prov_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `fk_prov_city` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  ADD CONSTRAINT `fk_prov_neigh` FOREIGN KEY (`neighborhood_id`) REFERENCES `neighborhoods` (`id`),
  ADD CONSTRAINT `fk_prov_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `provider_photos`
  ADD CONSTRAINT `fk_photos_prov` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE;

ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `reports`
  ADD CONSTRAINT `fk_rep_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_rev_provider` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rev_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `review_responses`
  ADD CONSTRAINT `fk_rresp_prov` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rresp_review` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`) ON DELETE CASCADE;

ALTER TABLE `subscriptions`
  ADD CONSTRAINT `fk_sub_prov` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE;

ALTER TABLE `verification_requests`
  ADD CONSTRAINT `fk_vreq_prov` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`id`) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;