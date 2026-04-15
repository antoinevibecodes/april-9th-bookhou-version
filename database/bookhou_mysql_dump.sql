-- ============================================================
-- Bookhou Production MySQL Dump
-- Generated from Prisma schema + seed.ts
-- Database: bookhou_prod
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ============================================================
-- CREATE DATABASE
-- ============================================================

CREATE DATABASE IF NOT EXISTS `bookhou_prod`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `bookhou_prod`;

-- ============================================================
-- DROP EXISTING TABLES (in reverse dependency order)
-- ============================================================

DROP TABLE IF EXISTS `blocked_times`;
DROP TABLE IF EXISTS `gallery_images`;
DROP TABLE IF EXISTS `social_links`;
DROP TABLE IF EXISTS `notification_emails`;
DROP TABLE IF EXISTS `email_logs`;
DROP TABLE IF EXISTS `email_templates`;
DROP TABLE IF EXISTS `party_types`;
DROP TABLE IF EXISTS `coupon_packages`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `party_waivers`;
DROP TABLE IF EXISTS `waiver_questions`;
DROP TABLE IF EXISTS `waiver_templates`;
DROP TABLE IF EXISTS `party_assignments`;
DROP TABLE IF EXISTS `party_notes`;
DROP TABLE IF EXISTS `party_addons`;
DROP TABLE IF EXISTS `invitations`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `parties`;
DROP TABLE IF EXISTS `package_addons`;
DROP TABLE IF EXISTS `package_time_slots`;
DROP TABLE IF EXISTS `package_rooms`;
DROP TABLE IF EXISTS `addons`;
DROP TABLE IF EXISTS `packages`;
DROP TABLE IF EXISTS `room_files`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `taxes`;
DROP TABLE IF EXISTS `off_days`;
DROP TABLE IF EXISTS `work_hours`;
DROP TABLE IF EXISTS `business_members`;
DROP TABLE IF EXISTS `business_locations`;
DROP TABLE IF EXISTS `businesses`;
DROP TABLE IF EXISTS `users`;

-- ============================================================
-- TABLE: users
-- ============================================================

CREATE TABLE `users` (
  `id` VARCHAR(30) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(255) NOT NULL,
  `last_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(255) DEFAULT NULL,
  `role` ENUM('SUPER_ADMIN','BUSINESS_OWNER','MANAGER','EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: businesses
-- ============================================================

CREATE TABLE `businesses` (
  `id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `prefix` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(255) DEFAULT NULL,
  `logo_url` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `businesses_prefix_key` (`prefix`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: business_locations
-- ============================================================

CREATE TABLE `business_locations` (
  `id` VARCHAR(30) NOT NULL,
  `business_id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `prefix` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(255) DEFAULT NULL,
  `state` VARCHAR(255) DEFAULT NULL,
  `zip_code` VARCHAR(255) DEFAULT NULL,
  `country` VARCHAR(255) DEFAULT 'US',
  `phone` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `timezone` VARCHAR(255) NOT NULL DEFAULT 'America/New_York',
  `currency` VARCHAR(255) NOT NULL DEFAULT 'USD',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `stripe_secret_key` VARCHAR(255) DEFAULT NULL,
  `stripe_public_key` VARCHAR(255) DEFAULT NULL,
  `square_access_token` VARCHAR(255) DEFAULT NULL,
  `square_location_id` VARCHAR(255) DEFAULT NULL,
  `square_app_id` VARCHAR(255) DEFAULT NULL,
  `square_environment` VARCHAR(255) DEFAULT 'sandbox',
  `payment_method` VARCHAR(255) NOT NULL DEFAULT 'stripe',
  `booking_page_title` VARCHAR(255) DEFAULT NULL,
  `booking_page_desc` VARCHAR(255) DEFAULT NULL,
  `refund_policy` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `business_locations_prefix_key` (`prefix`),
  KEY `business_locations_business_id_fkey` (`business_id`),
  CONSTRAINT `business_locations_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: business_members
-- ============================================================

CREATE TABLE `business_members` (
  `id` VARCHAR(30) NOT NULL,
  `business_id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `user_id` VARCHAR(30) NOT NULL,
  `role` ENUM('SUPER_ADMIN','BUSINESS_OWNER','MANAGER','EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `business_members_user_id_location_id_key` (`user_id`, `location_id`),
  KEY `business_members_business_id_fkey` (`business_id`),
  KEY `business_members_location_id_fkey` (`location_id`),
  CONSTRAINT `business_members_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `business_members_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `business_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: work_hours
-- ============================================================

CREATE TABLE `work_hours` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `day_of_week` INT NOT NULL,
  `open_time` VARCHAR(255) NOT NULL,
  `close_time` VARCHAR(255) NOT NULL,
  `is_closed` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_hours_location_id_day_of_week_key` (`location_id`, `day_of_week`),
  CONSTRAINT `work_hours_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: off_days
-- ============================================================

CREATE TABLE `off_days` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `date` DATE NOT NULL,
  `reason` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `off_days_location_id_date_key` (`location_id`, `date`),
  CONSTRAINT `off_days_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: rooms
-- ============================================================

CREATE TABLE `rooms` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `capacity` INT DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `rooms_location_id_fkey` (`location_id`),
  CONSTRAINT `rooms_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: room_files
-- ============================================================

CREATE TABLE `room_files` (
  `id` VARCHAR(30) NOT NULL,
  `room_id` VARCHAR(30) NOT NULL,
  `file_url` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(255) NOT NULL DEFAULT 'image',
  PRIMARY KEY (`id`),
  KEY `room_files_room_id_fkey` (`room_id`),
  CONSTRAINT `room_files_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: packages
-- ============================================================

CREATE TABLE `packages` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `contents` TEXT DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `cost` DECIMAL(10,2) DEFAULT NULL,
  `extra_per_person_price` DECIMAL(10,2) DEFAULT NULL,
  `duration` INT NOT NULL,
  `buffer_time` INT NOT NULL DEFAULT 0,
  `min_guests` INT DEFAULT NULL,
  `max_guests` INT DEFAULT NULL,
  `color` VARCHAR(255) DEFAULT NULL,
  `event_type` ENUM('BIRTHDAY','FIELD_TRIP','CORPORATE','CUSTOM') NOT NULL DEFAULT 'BIRTHDAY',
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `packages_location_id_fkey` (`location_id`),
  CONSTRAINT `packages_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: package_rooms
-- ============================================================

CREATE TABLE `package_rooms` (
  `id` VARCHAR(30) NOT NULL,
  `package_id` VARCHAR(30) NOT NULL,
  `room_id` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_rooms_package_id_room_id_key` (`package_id`, `room_id`),
  KEY `package_rooms_room_id_fkey` (`room_id`),
  CONSTRAINT `package_rooms_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `package_rooms_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: package_time_slots
-- ============================================================

CREATE TABLE `package_time_slots` (
  `id` VARCHAR(30) NOT NULL,
  `package_id` VARCHAR(30) NOT NULL,
  `day_of_week` INT NOT NULL,
  `start_time` VARCHAR(255) NOT NULL,
  `end_time` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `package_time_slots_package_id_fkey` (`package_id`),
  CONSTRAINT `package_time_slots_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: addons
-- ============================================================

CREATE TABLE `addons` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `cost` DECIMAL(10,2) DEFAULT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `is_custom` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `addons_location_id_fkey` (`location_id`),
  CONSTRAINT `addons_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: package_addons
-- ============================================================

CREATE TABLE `package_addons` (
  `id` VARCHAR(30) NOT NULL,
  `package_id` VARCHAR(30) NOT NULL,
  `addon_id` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_addons_package_id_addon_id_key` (`package_id`, `addon_id`),
  KEY `package_addons_addon_id_fkey` (`addon_id`),
  CONSTRAINT `package_addons_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `package_addons_addon_id_fkey` FOREIGN KEY (`addon_id`) REFERENCES `addons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: parties
-- ============================================================

CREATE TABLE `parties` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `package_id` VARCHAR(30) NOT NULL,
  `room_id` VARCHAR(30) DEFAULT NULL,
  `status` ENUM('REQUEST','ACTIVE','GUEST','BOOKING_BLOCK','REJECTED','CANCELLED','COMPLETE') NOT NULL DEFAULT 'REQUEST',
  `event_type` ENUM('BIRTHDAY','FIELD_TRIP','CORPORATE','CUSTOM') NOT NULL DEFAULT 'BIRTHDAY',
  `host_first_name` VARCHAR(255) NOT NULL,
  `host_last_name` VARCHAR(255) NOT NULL,
  `host_email` VARCHAR(255) NOT NULL,
  `host_phone` VARCHAR(255) NOT NULL,
  `child_name` VARCHAR(255) DEFAULT NULL,
  `child_dob` DATE DEFAULT NULL,
  `party_name` VARCHAR(255) NOT NULL,
  `party_date` DATE NOT NULL,
  `start_time` VARCHAR(255) NOT NULL,
  `end_time` VARCHAR(255) NOT NULL,
  `guest_count` INT NOT NULL,
  `banner_url` VARCHAR(255) DEFAULT NULL,
  `package_price` DECIMAL(10,2) NOT NULL,
  `extra_person_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `addon_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_rate` DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  `tax_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10,2) NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `amount_refunded` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `cancellation_fee` DECIMAL(10,2) DEFAULT NULL,
  `cancellation_refund_type` ENUM('PERCENTAGE','FIXED_AMOUNT') DEFAULT NULL,
  `cancellation_refund_value` DECIMAL(10,2) DEFAULT NULL,
  `cancelled_at` DATETIME DEFAULT NULL,
  `cancellation_reason` TEXT DEFAULT NULL,
  `invoice_number` VARCHAR(255) DEFAULT NULL,
  `booking_screen_data` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `parties_invoice_number_key` (`invoice_number`),
  KEY `parties_location_id_party_date_idx` (`location_id`, `party_date`),
  KEY `parties_status_idx` (`status`),
  KEY `parties_package_id_fkey` (`package_id`),
  KEY `parties_room_id_fkey` (`room_id`),
  CONSTRAINT `parties_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `parties_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `parties_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: party_addons
-- ============================================================

CREATE TABLE `party_addons` (
  `id` VARCHAR(30) NOT NULL,
  `party_id` VARCHAR(30) NOT NULL,
  `addon_id` VARCHAR(30) DEFAULT NULL,
  `custom_name` VARCHAR(255) DEFAULT NULL,
  `custom_desc` VARCHAR(255) DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `party_addons_party_id_fkey` (`party_id`),
  KEY `party_addons_addon_id_fkey` (`addon_id`),
  CONSTRAINT `party_addons_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `party_addons_addon_id_fkey` FOREIGN KEY (`addon_id`) REFERENCES `addons` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: party_notes
-- ============================================================

CREATE TABLE `party_notes` (
  `id` VARCHAR(30) NOT NULL,
  `party_id` VARCHAR(30) NOT NULL,
  `user_id` VARCHAR(30) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `party_notes_party_id_fkey` (`party_id`),
  KEY `party_notes_user_id_fkey` (`user_id`),
  CONSTRAINT `party_notes_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `party_notes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: party_assignments
-- ============================================================

CREATE TABLE `party_assignments` (
  `id` VARCHAR(30) NOT NULL,
  `party_id` VARCHAR(30) NOT NULL,
  `user_id` VARCHAR(30) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `party_assignments_party_id_user_id_key` (`party_id`, `user_id`),
  KEY `party_assignments_user_id_fkey` (`user_id`),
  CONSTRAINT `party_assignments_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `party_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: payments
-- ============================================================

CREATE TABLE `payments` (
  `id` VARCHAR(30) NOT NULL,
  `party_id` VARCHAR(30) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `type` ENUM('CARD','CASH','APPLE_PAY','CASH_APP','SQUARE_OTHER') NOT NULL,
  `status` ENUM('PAID','REFUND','TIP','PENDING') NOT NULL DEFAULT 'PAID',
  `note` VARCHAR(255) DEFAULT NULL,
  `card_last4` VARCHAR(255) DEFAULT NULL,
  `cardholder_name` VARCHAR(255) DEFAULT NULL,
  `card_brand` VARCHAR(255) DEFAULT NULL,
  `stripe_payment_id` VARCHAR(255) DEFAULT NULL,
  `square_payment_id` VARCHAR(255) DEFAULT NULL,
  `refunded_amount` DECIMAL(10,2) DEFAULT NULL,
  `refunded_at` DATETIME DEFAULT NULL,
  `refund_reason` VARCHAR(255) DEFAULT NULL,
  `processed_by` VARCHAR(255) DEFAULT NULL,
  `processed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payments_party_id_idx` (`party_id`),
  KEY `payments_processed_at_idx` (`processed_at`),
  KEY `payments_type_idx` (`type`),
  KEY `payments_status_idx` (`status`),
  CONSTRAINT `payments_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: invitations
-- ============================================================

CREATE TABLE `invitations` (
  `id` VARCHAR(30) NOT NULL,
  `party_id` VARCHAR(30) NOT NULL,
  `guest_name` VARCHAR(255) NOT NULL,
  `guest_email` VARCHAR(255) DEFAULT NULL,
  `guest_phone` VARCHAR(255) DEFAULT NULL,
  `method` ENUM('EMAIL','SMS','BOTH') NOT NULL DEFAULT 'EMAIL',
  `rsvp_status` VARCHAR(255) DEFAULT NULL,
  `rsvp_at` DATETIME DEFAULT NULL,
  `waiver_signed` TINYINT(1) NOT NULL DEFAULT 0,
  `sent_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `invitations_party_id_fkey` (`party_id`),
  CONSTRAINT `invitations_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: waiver_templates
-- ============================================================

CREATE TABLE `waiver_templates` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `waiver_templates_location_id_fkey` (`location_id`),
  CONSTRAINT `waiver_templates_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: waiver_questions
-- ============================================================

CREATE TABLE `waiver_questions` (
  `id` VARCHAR(30) NOT NULL,
  `template_id` VARCHAR(30) NOT NULL,
  `question` VARCHAR(255) NOT NULL,
  `type` VARCHAR(255) NOT NULL DEFAULT 'text',
  `options` JSON DEFAULT NULL,
  `is_required` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `waiver_questions_template_id_fkey` (`template_id`),
  CONSTRAINT `waiver_questions_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `waiver_templates` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: party_waivers
-- ============================================================

CREATE TABLE `party_waivers` (
  `id` VARCHAR(30) NOT NULL,
  `party_id` VARCHAR(30) NOT NULL,
  `template_id` VARCHAR(30) NOT NULL,
  `signer_name` VARCHAR(255) NOT NULL,
  `signer_email` VARCHAR(255) DEFAULT NULL,
  `signer_phone` VARCHAR(255) DEFAULT NULL,
  `signature_data` LONGTEXT DEFAULT NULL,
  `answers` JSON DEFAULT NULL,
  `status` ENUM('PENDING','SIGNED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `is_host` TINYINT(1) NOT NULL DEFAULT 0,
  `minors` JSON DEFAULT NULL,
  `signed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `party_waivers_party_id_fkey` (`party_id`),
  KEY `party_waivers_template_id_fkey` (`template_id`),
  CONSTRAINT `party_waivers_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `party_waivers_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `waiver_templates` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: coupons
-- ============================================================

CREATE TABLE `coupons` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `code` VARCHAR(255) NOT NULL,
  `type` ENUM('PERCENTAGE','FIXED_AMOUNT','PACKAGE','FULL_AMOUNT') NOT NULL,
  `value` DECIMAL(10,2) NOT NULL,
  `max_uses` INT DEFAULT NULL,
  `used_count` INT NOT NULL DEFAULT 0,
  `valid_from` DATETIME DEFAULT NULL,
  `valid_until` DATETIME DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupons_location_id_code_key` (`location_id`, `code`),
  CONSTRAINT `coupons_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: coupon_packages
-- ============================================================

CREATE TABLE `coupon_packages` (
  `id` VARCHAR(30) NOT NULL,
  `coupon_id` VARCHAR(30) NOT NULL,
  `package_id` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupon_packages_coupon_id_package_id_key` (`coupon_id`, `package_id`),
  KEY `coupon_packages_package_id_fkey` (`package_id`),
  CONSTRAINT `coupon_packages_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `coupon_packages_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: taxes
-- ============================================================

CREATE TABLE `taxes` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `rate` DECIMAL(5,4) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `taxes_location_id_fkey` (`location_id`),
  CONSTRAINT `taxes_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: party_types
-- ============================================================

CREATE TABLE `party_types` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `party_types_location_id_fkey` (`location_id`),
  CONSTRAINT `party_types_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: email_templates
-- ============================================================

CREATE TABLE `email_templates` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body` LONGTEXT NOT NULL,
  `trigger` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email_templates_location_id_fkey` (`location_id`),
  CONSTRAINT `email_templates_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: email_logs
-- ============================================================

CREATE TABLE `email_logs` (
  `id` VARCHAR(30) NOT NULL,
  `party_id` VARCHAR(30) DEFAULT NULL,
  `recipient` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'sent',
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email_logs_party_id_idx` (`party_id`),
  CONSTRAINT `email_logs_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: notification_emails
-- ============================================================

CREATE TABLE `notification_emails` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `notification_emails_location_id_fkey` (`location_id`),
  CONSTRAINT `notification_emails_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: social_links
-- ============================================================

CREATE TABLE `social_links` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `platform` VARCHAR(255) NOT NULL,
  `url` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `social_links_location_id_fkey` (`location_id`),
  CONSTRAINT `social_links_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: gallery_images
-- ============================================================

CREATE TABLE `gallery_images` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `caption` VARCHAR(255) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `gallery_images_location_id_fkey` (`location_id`),
  CONSTRAINT `gallery_images_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `business_locations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: blocked_times
-- ============================================================

CREATE TABLE `blocked_times` (
  `id` VARCHAR(30) NOT NULL,
  `location_id` VARCHAR(30) NOT NULL,
  `room_id` VARCHAR(30) DEFAULT NULL,
  `date` DATE NOT NULL,
  `start_time` VARCHAR(255) NOT NULL,
  `end_time` VARCHAR(255) NOT NULL,
  `reason` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `blocked_times_location_id_date_idx` (`location_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ============================================================
-- SEED DATA
-- ============================================================
-- ============================================================

-- ============================================================
-- SEED: users
-- ============================================================

INSERT INTO `users` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `phone`, `role`, `is_active`, `created_at`, `updated_at`) VALUES
('cm_seed_admin_001', 'admin@tinytowne.com', '$2b$10$Z9PtTNwBGjbC1R/5B02zJ.j0LllPuSPinPt6.kozrUqZU21fRawga', 'Admin', 'User', '+14045551000', 'SUPER_ADMIN', 1, NOW(), NOW()),
('cm_seed_owner_001', 'owner@tinytowne.com', '$2b$10$qyz6DtPv8oPtL/zToLBRc..UMuER/jpBAWqjo.QqpNieYBdkvGSw6', 'Sarah', 'Johnson', '+14045552000', 'BUSINESS_OWNER', 1, NOW(), NOW()),
('cm_seed_manager_001', 'manager@tinytowne.com', '$2b$10$kkpRjS8lMTJGimGapnEO6OHPsxkYjfuzkhsixYr.IKHeqO//tcn1i', 'Mike', 'Thompson', '+14045553000', 'MANAGER', 1, NOW(), NOW()),
('cm_seed_employee_001', 'employee@tinytowne.com', '$2b$10$w0OLmEoz4Sb4YORBwtnU/uAPiJlDAmm1d7JFOfTWLXSfVt/gtbO1e', 'Emily', 'Davis', '+14045554000', 'EMPLOYEE', 1, NOW(), NOW());

-- ============================================================
-- SEED: businesses
-- ============================================================

INSERT INTO `businesses` (`id`, `name`, `prefix`, `email`, `phone`, `is_active`, `created_at`, `updated_at`) VALUES
('cm_seed_biz_001', 'Tiny Towne', 'TT', 'info@tinytowne.com', '+14045550000', 1, NOW(), NOW());

-- ============================================================
-- SEED: business_locations
-- ============================================================

INSERT INTO `business_locations` (`id`, `business_id`, `name`, `prefix`, `address`, `city`, `state`, `zip_code`, `country`, `phone`, `email`, `timezone`, `currency`, `is_active`, `payment_method`, `booking_page_title`, `booking_page_desc`, `refund_policy`, `created_at`, `updated_at`) VALUES
('cm_seed_loc_001', 'cm_seed_biz_001', 'Tiny Towne Atlanta', 'TT-ATL', '6000 North Point Pkwy', 'Alpharetta', 'GA', '30022', 'US', '+14045550001', 'atlanta@tinytowne.com', 'America/New_York', 'USD', 1, 'stripe', 'Book Your Party at Tiny Towne!', 'The ultimate kids party destination in Atlanta. Book your birthday party, field trip, or corporate event today!', 'Cancellations made 7+ days before the event receive a full refund. Cancellations within 7 days are subject to a 50% cancellation fee. No refunds for no-shows.', NOW(), NOW());

-- ============================================================
-- SEED: business_members
-- ============================================================

INSERT INTO `business_members` (`id`, `business_id`, `location_id`, `user_id`, `role`, `is_active`, `created_at`) VALUES
('cm_seed_member_001', 'cm_seed_biz_001', 'cm_seed_loc_001', 'cm_seed_owner_001', 'BUSINESS_OWNER', 1, NOW()),
('cm_seed_member_002', 'cm_seed_biz_001', 'cm_seed_loc_001', 'cm_seed_manager_001', 'MANAGER', 1, NOW()),
('cm_seed_member_003', 'cm_seed_biz_001', 'cm_seed_loc_001', 'cm_seed_employee_001', 'EMPLOYEE', 1, NOW());

-- ============================================================
-- SEED: work_hours
-- ============================================================

INSERT INTO `work_hours` (`id`, `location_id`, `day_of_week`, `open_time`, `close_time`, `is_closed`) VALUES
('cm_seed_wh_sun', 'cm_seed_loc_001', 0, '12:00', '18:00', 0),
('cm_seed_wh_mon', 'cm_seed_loc_001', 1, '10:00', '20:00', 0),
('cm_seed_wh_tue', 'cm_seed_loc_001', 2, '10:00', '20:00', 0),
('cm_seed_wh_wed', 'cm_seed_loc_001', 3, '10:00', '20:00', 0),
('cm_seed_wh_thu', 'cm_seed_loc_001', 4, '10:00', '21:00', 0),
('cm_seed_wh_fri', 'cm_seed_loc_001', 5, '10:00', '22:00', 0),
('cm_seed_wh_sat', 'cm_seed_loc_001', 6, '10:00', '22:00', 0);

-- ============================================================
-- SEED: rooms
-- ============================================================

INSERT INTO `rooms` (`id`, `location_id`, `name`, `description`, `capacity`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('cm_seed_room_001', 'cm_seed_loc_001', 'Party Room A', 'Main party room with decorations and seating for up to 30 guests', 30, 1, 1, NOW(), NOW()),
('cm_seed_room_002', 'cm_seed_loc_001', 'Party Room B', 'Cozy party room perfect for smaller gatherings, seats 15', 15, 2, 1, NOW(), NOW()),
('cm_seed_room_003', 'cm_seed_loc_001', 'VIP Suite', 'Premium party suite with private play area and dedicated host', 20, 3, 1, NOW(), NOW()),
('cm_seed_room_004', 'cm_seed_loc_001', 'Outdoor Pavilion', 'Covered outdoor area with picnic tables, great for large groups', 50, 4, 1, NOW(), NOW());

-- ============================================================
-- SEED: taxes
-- ============================================================

INSERT INTO `taxes` (`id`, `location_id`, `name`, `rate`, `is_default`, `is_active`, `created_at`) VALUES
('cm_seed_tax_001', 'cm_seed_loc_001', 'Georgia Sales Tax', 0.0600, 1, 1, NOW());

-- ============================================================
-- SEED: packages
-- ============================================================

INSERT INTO `packages` (`id`, `location_id`, `name`, `description`, `contents`, `price`, `cost`, `extra_per_person_price`, `duration`, `buffer_time`, `min_guests`, `max_guests`, `color`, `event_type`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('cm_seed_pkg_001', 'cm_seed_loc_001', 'Basic Birthday Party', 'Perfect starter party package for kids!', '1.5 hours of play time, 1 pizza, juice boxes for all guests, paper plates & napkins, birthday crown for the birthday child', 199.99, NULL, NULL, 90, 30, 5, 15, '#FF6B6B', 'BIRTHDAY', 1, 1, NOW(), NOW()),
('cm_seed_pkg_002', 'cm_seed_loc_001', 'Premium Birthday Bash', 'The ultimate birthday experience with all the extras!', '2 hours of play time, 2 pizzas, drinks, ice cream cake, goodie bags for all guests, balloon arch, dedicated party host', 349.99, NULL, NULL, 120, 30, 10, 25, '#6C5CE7', 'BIRTHDAY', 2, 1, NOW(), NOW()),
('cm_seed_pkg_003', 'cm_seed_loc_001', 'VIP Party Experience', 'Private VIP suite with premium everything', '2.5 hours in VIP suite, catered food & drinks, custom cake, photo booth, goodie bags, dedicated host, balloon decorations', 549.99, NULL, NULL, 150, 30, 10, 20, '#FDCB6E', 'BIRTHDAY', 3, 1, NOW(), NOW()),
('cm_seed_pkg_004', 'cm_seed_loc_001', 'Field Trip Package', 'School and daycare field trip package with educational activities', '3 hours of structured play and activities, lunch for all students, educational station access, group photo', 12.99, 5.00, 12.99, 180, 30, 15, 50, '#00B894', 'FIELD_TRIP', 4, 1, NOW(), NOW()),
('cm_seed_pkg_005', 'cm_seed_loc_001', 'Corporate Event', 'Team building and corporate party package', '3 hours venue rental, catering for all guests, A/V setup, dedicated event coordinator', 799.99, NULL, NULL, 180, 60, 20, 50, '#0984E3', 'CORPORATE', 5, 1, NOW(), NOW());

-- ============================================================
-- SEED: package_rooms (link packages to rooms)
-- ============================================================

INSERT INTO `package_rooms` (`id`, `package_id`, `room_id`) VALUES
('cm_seed_pkgroom_001', 'cm_seed_pkg_001', 'cm_seed_room_001'),
('cm_seed_pkgroom_002', 'cm_seed_pkg_001', 'cm_seed_room_002'),
('cm_seed_pkgroom_003', 'cm_seed_pkg_002', 'cm_seed_room_001'),
('cm_seed_pkgroom_004', 'cm_seed_pkg_003', 'cm_seed_room_003'),
('cm_seed_pkgroom_005', 'cm_seed_pkg_004', 'cm_seed_room_004'),
('cm_seed_pkgroom_006', 'cm_seed_pkg_005', 'cm_seed_room_001'),
('cm_seed_pkgroom_007', 'cm_seed_pkg_005', 'cm_seed_room_004');

-- ============================================================
-- SEED: package_time_slots (birthday packages, Sat & Sun)
-- ============================================================

-- Basic Birthday Party (pkg_001) time slots
INSERT INTO `package_time_slots` (`id`, `package_id`, `day_of_week`, `start_time`, `end_time`) VALUES
('cm_seed_pts_001', 'cm_seed_pkg_001', 6, '10:00', '11:30'),
('cm_seed_pts_002', 'cm_seed_pkg_001', 6, '12:00', '13:30'),
('cm_seed_pts_003', 'cm_seed_pkg_001', 6, '14:00', '15:30'),
('cm_seed_pts_004', 'cm_seed_pkg_001', 6, '16:00', '17:30'),
('cm_seed_pts_005', 'cm_seed_pkg_001', 0, '12:00', '13:30'),
('cm_seed_pts_006', 'cm_seed_pkg_001', 0, '14:00', '15:30'),
-- Premium Birthday Bash (pkg_002) time slots
('cm_seed_pts_007', 'cm_seed_pkg_002', 6, '10:00', '11:30'),
('cm_seed_pts_008', 'cm_seed_pkg_002', 6, '12:00', '13:30'),
('cm_seed_pts_009', 'cm_seed_pkg_002', 6, '14:00', '15:30'),
('cm_seed_pts_010', 'cm_seed_pkg_002', 6, '16:00', '17:30'),
('cm_seed_pts_011', 'cm_seed_pkg_002', 0, '12:00', '13:30'),
('cm_seed_pts_012', 'cm_seed_pkg_002', 0, '14:00', '15:30'),
-- VIP Party Experience (pkg_003) time slots
('cm_seed_pts_013', 'cm_seed_pkg_003', 6, '10:00', '11:30'),
('cm_seed_pts_014', 'cm_seed_pkg_003', 6, '12:00', '13:30'),
('cm_seed_pts_015', 'cm_seed_pkg_003', 6, '14:00', '15:30'),
('cm_seed_pts_016', 'cm_seed_pkg_003', 6, '16:00', '17:30'),
('cm_seed_pts_017', 'cm_seed_pkg_003', 0, '12:00', '13:30'),
('cm_seed_pts_018', 'cm_seed_pkg_003', 0, '14:00', '15:30');

-- ============================================================
-- SEED: addons
-- ============================================================

INSERT INTO `addons` (`id`, `location_id`, `name`, `description`, `price`, `cost`, `image_url`, `is_custom`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('cm_seed_addon_001', 'cm_seed_loc_001', 'Extra Pizza', 'Large pizza (cheese or pepperoni)', 18.99, NULL, NULL, 0, 1, 1, NOW(), NOW()),
('cm_seed_addon_002', 'cm_seed_loc_001', 'Goodie Bags (10-pack)', 'Fun-filled goodie bags for each guest', 29.99, NULL, NULL, 0, 2, 1, NOW(), NOW()),
('cm_seed_addon_003', 'cm_seed_loc_001', 'Balloon Arch', 'Custom color balloon arch for the party area', 49.99, NULL, NULL, 0, 3, 1, NOW(), NOW()),
('cm_seed_addon_004', 'cm_seed_loc_001', 'Face Painting', '1 hour of professional face painting', 75.00, NULL, NULL, 0, 4, 1, NOW(), NOW()),
('cm_seed_addon_005', 'cm_seed_loc_001', 'Extra Play Time (30 min)', 'Add 30 minutes of play time to your party', 35.00, NULL, NULL, 0, 5, 1, NOW(), NOW()),
('cm_seed_addon_006', 'cm_seed_loc_001', 'Custom Cake', 'Custom decorated cake (serves 20)', 59.99, NULL, NULL, 0, 6, 1, NOW(), NOW()),
('cm_seed_addon_007', 'cm_seed_loc_001', 'Photo Booth', 'Photo booth with props and instant prints', 89.99, NULL, NULL, 0, 7, 1, NOW(), NOW()),
('cm_seed_addon_008', 'cm_seed_loc_001', 'Custom Add-On', 'Custom add-on with your own price', 0.00, NULL, NULL, 1, 99, 1, NOW(), NOW());

-- ============================================================
-- SEED: package_addons (link addons to packages)
-- ============================================================

INSERT INTO `package_addons` (`id`, `package_id`, `addon_id`) VALUES
('cm_seed_pkgadd_001', 'cm_seed_pkg_001', 'cm_seed_addon_001'),
('cm_seed_pkgadd_002', 'cm_seed_pkg_001', 'cm_seed_addon_002'),
('cm_seed_pkgadd_003', 'cm_seed_pkg_001', 'cm_seed_addon_003'),
('cm_seed_pkgadd_004', 'cm_seed_pkg_002', 'cm_seed_addon_001'),
('cm_seed_pkgadd_005', 'cm_seed_pkg_002', 'cm_seed_addon_004'),
('cm_seed_pkgadd_006', 'cm_seed_pkg_002', 'cm_seed_addon_005'),
('cm_seed_pkgadd_007', 'cm_seed_pkg_002', 'cm_seed_addon_007'),
('cm_seed_pkgadd_008', 'cm_seed_pkg_003', 'cm_seed_addon_004'),
('cm_seed_pkgadd_009', 'cm_seed_pkg_003', 'cm_seed_addon_005');

-- ============================================================
-- SEED: coupons
-- ============================================================

INSERT INTO `coupons` (`id`, `location_id`, `code`, `type`, `value`, `max_uses`, `used_count`, `is_active`, `created_at`, `updated_at`) VALUES
('cm_seed_coupon_001', 'cm_seed_loc_001', 'WELCOME10', 'PERCENTAGE', 10.00, 100, 0, 1, NOW(), NOW()),
('cm_seed_coupon_002', 'cm_seed_loc_001', 'SAVE25', 'FIXED_AMOUNT', 25.00, 50, 0, 1, NOW(), NOW()),
('cm_seed_coupon_003', 'cm_seed_loc_001', 'FREEBIRTHDAY', 'FULL_AMOUNT', 0.00, 5, 0, 1, NOW(), NOW());

-- ============================================================
-- SEED: waiver_templates
-- ============================================================

INSERT INTO `waiver_templates` (`id`, `location_id`, `name`, `content`, `is_default`, `is_active`, `created_at`, `updated_at`) VALUES
('cm_seed_waiver_t_001', 'cm_seed_loc_001', 'Standard Liability Waiver', '<h2>WAIVER AND RELEASE OF LIABILITY</h2>\n<p>In consideration of being allowed to participate in activities at Tiny Towne, I hereby:</p>\n<ol>\n<li>Acknowledge that participation involves inherent risks including but not limited to falls, collisions, and other physical injuries.</li>\n<li>Voluntarily assume all risks associated with participation.</li>\n<li>Release, waive, and discharge Tiny Towne, its owners, operators, employees, and agents from any liability.</li>\n<li>Agree to indemnify and hold harmless Tiny Towne from any claims arising from participation.</li>\n</ol>\n<p>I have read this waiver and release, fully understand its terms, and understand that I am giving up substantial rights by signing it.</p>', 1, 1, NOW(), NOW());

-- ============================================================
-- SEED: waiver_questions
-- ============================================================

INSERT INTO `waiver_questions` (`id`, `template_id`, `question`, `type`, `options`, `is_required`, `sort_order`) VALUES
('cm_seed_wq_001', 'cm_seed_waiver_t_001', 'Does the child have any allergies?', 'text', NULL, 0, 1),
('cm_seed_wq_002', 'cm_seed_waiver_t_001', 'Does the child have any medical conditions we should know about?', 'text', NULL, 0, 2),
('cm_seed_wq_003', 'cm_seed_waiver_t_001', 'Emergency contact name and phone number', 'text', NULL, 1, 3),
('cm_seed_wq_004', 'cm_seed_waiver_t_001', 'I agree to the terms and conditions above', 'checkbox', NULL, 1, 4);

-- ============================================================
-- SEED: email_templates
-- ============================================================

INSERT INTO `email_templates` (`id`, `location_id`, `name`, `subject`, `body`, `trigger`, `is_active`, `created_at`, `updated_at`) VALUES
('cm_seed_etpl_001', 'cm_seed_loc_001', 'Booking Confirmation', 'Your Party at Tiny Towne is Confirmed!', '<h2>Booking Confirmed!</h2><p>Dear {{hostName}},</p><p>Your party <strong>{{partyName}}</strong> has been confirmed for {{partyDate}} at {{partyTime}}.</p><p>Package: {{packageName}}</p><p>Total: ${{total}}</p><p><a href=\"{{bookingLink}}\">View Booking Details</a></p>', 'booking_confirmed', 1, NOW(), NOW()),
('cm_seed_etpl_002', 'cm_seed_loc_001', 'Payment Received', 'Payment Received - {{partyName}}', '<h2>Payment Received</h2><p>Dear {{hostName}},</p><p>We received a payment of ${{amount}} for <strong>{{partyName}}</strong>.</p><p>Remaining Balance: ${{balance}}</p>', 'payment_received', 1, NOW(), NOW()),
('cm_seed_etpl_003', 'cm_seed_loc_001', 'Party Reminder', 'Reminder: {{partyName}} is Tomorrow!', '<h2>Party Reminder</h2><p>Dear {{hostName}},</p><p>This is a friendly reminder that <strong>{{partyName}}</strong> is tomorrow at {{partyTime}}!</p><p>Location: {{locationName}}, {{locationAddress}}</p><p>Please arrive 15 minutes early for check-in.</p>', 'party_reminder', 1, NOW(), NOW()),
('cm_seed_etpl_004', 'cm_seed_loc_001', 'Cancellation Confirmation', 'Party Cancelled - {{partyName}}', '<h2>Party Cancelled</h2><p>Dear {{hostName}},</p><p>Your party <strong>{{partyName}}</strong> scheduled for {{partyDate}} has been cancelled.</p><p>{{refundInfo}}</p>', 'cancellation', 1, NOW(), NOW());

-- ============================================================
-- SEED: party_types
-- ============================================================

INSERT INTO `party_types` (`id`, `location_id`, `name`, `description`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
('cm_seed_ptype_001', 'cm_seed_loc_001', 'Birthday Party', 'Classic birthday celebration', 1, 1, NOW(), NOW()),
('cm_seed_ptype_002', 'cm_seed_loc_001', 'Field Trip', 'School and daycare field trips', 2, 1, NOW(), NOW()),
('cm_seed_ptype_003', 'cm_seed_loc_001', 'Corporate Event', 'Team building and corporate parties', 3, 1, NOW(), NOW()),
('cm_seed_ptype_004', 'cm_seed_loc_001', 'Private Event', 'Custom private events', 4, 1, NOW(), NOW());

-- ============================================================
-- SEED: parties (sample bookings)
-- ============================================================

-- Party 1: Olivia's 7th Birthday (ACTIVE, with deposit paid)
INSERT INTO `parties` (`id`, `location_id`, `package_id`, `room_id`, `status`, `event_type`, `host_first_name`, `host_last_name`, `host_email`, `host_phone`, `child_name`, `party_name`, `party_date`, `start_time`, `end_time`, `guest_count`, `package_price`, `extra_person_amount`, `addon_total`, `subtotal`, `discount_amount`, `tax_rate`, `tax_amount`, `total`, `amount_paid`, `amount_refunded`, `balance`, `invoice_number`, `created_at`, `updated_at`) VALUES
('cm_seed_party_001', 'cm_seed_loc_001', 'cm_seed_pkg_002', 'cm_seed_room_001', 'ACTIVE', 'BIRTHDAY', 'Jessica', 'Williams', 'jessica@example.com', '+14045556001', 'Olivia', 'Olivia\'s 7th Birthday', DATE_ADD(CURDATE(), INTERVAL (12 - WEEKDAY(CURDATE())) DAY), '14:00', '16:00', 15, 349.99, 0.00, 68.98, 418.97, 0.00, 0.0600, 25.14, 444.11, 200.00, 0.00, 244.11, '00000001', NOW(), NOW());

-- Party 2: Lucas's 5th Birthday (REQUEST, no payment yet)
INSERT INTO `parties` (`id`, `location_id`, `package_id`, `room_id`, `status`, `event_type`, `host_first_name`, `host_last_name`, `host_email`, `host_phone`, `child_name`, `party_name`, `party_date`, `start_time`, `end_time`, `guest_count`, `package_price`, `extra_person_amount`, `addon_total`, `subtotal`, `discount_amount`, `tax_rate`, `tax_amount`, `total`, `amount_paid`, `amount_refunded`, `balance`, `invoice_number`, `created_at`, `updated_at`) VALUES
('cm_seed_party_002', 'cm_seed_loc_001', 'cm_seed_pkg_001', 'cm_seed_room_002', 'REQUEST', 'BIRTHDAY', 'David', 'Chen', 'david@example.com', '+14045556002', 'Lucas', 'Lucas\'s 5th Birthday', DATE_ADD(CURDATE(), INTERVAL (19 - WEEKDAY(CURDATE())) DAY), '10:00', '11:30', 10, 199.99, 0.00, 0.00, 199.99, 20.00, 0.0600, 10.80, 190.79, 0.00, 0.00, 190.79, '00000002', NOW(), NOW());

-- ============================================================
-- SEED: party_addons (for party 1)
-- ============================================================

INSERT INTO `party_addons` (`id`, `party_id`, `addon_id`, `price`, `quantity`, `created_at`) VALUES
('cm_seed_pa_001', 'cm_seed_party_001', 'cm_seed_addon_001', 18.99, 1, NOW()),
('cm_seed_pa_002', 'cm_seed_party_001', 'cm_seed_addon_003', 49.99, 1, NOW());

-- ============================================================
-- SEED: payments (deposit for party 1)
-- ============================================================

INSERT INTO `payments` (`id`, `party_id`, `amount`, `type`, `status`, `card_last4`, `cardholder_name`, `card_brand`, `note`, `processed_at`, `created_at`) VALUES
('cm_seed_payment_001', 'cm_seed_party_001', 200.00, 'CARD', 'PAID', '4242', 'Jessica Williams', 'visa', 'Deposit payment', NOW(), NOW());

-- ============================================================
-- SEED: notification_emails
-- ============================================================

INSERT INTO `notification_emails` (`id`, `location_id`, `email`, `created_at`) VALUES
('cm_seed_notif_001', 'cm_seed_loc_001', 'owner@tinytowne.com', NOW()),
('cm_seed_notif_002', 'cm_seed_loc_001', 'manager@tinytowne.com', NOW());

-- ============================================================
-- SEED: social_links
-- ============================================================

INSERT INTO `social_links` (`id`, `location_id`, `platform`, `url`) VALUES
('cm_seed_social_001', 'cm_seed_loc_001', 'facebook', 'https://facebook.com/tinytowne'),
('cm_seed_social_002', 'cm_seed_loc_001', 'instagram', 'https://instagram.com/tinytowne'),
('cm_seed_social_003', 'cm_seed_loc_001', 'website', 'https://tinytowne.com');

-- ============================================================
-- RE-ENABLE FOREIGN KEY CHECKS
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- DONE
-- ============================================================
-- Login credentials:
--   Admin:    admin@tinytowne.com / admin123!
--   Owner:    owner@tinytowne.com / owner123!
--   Manager:  manager@tinytowne.com / manager123!
--   Employee: employee@tinytowne.com / employee123!
-- ============================================================
