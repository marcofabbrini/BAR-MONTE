-- Schema GESDI per MySQL / MariaDB.
-- Importabile da phpMyAdmin nel database Sql837388_4.
-- (Le tabelle vengono comunque create in automatico alla prima richiesta, se mancano.)

CREATE TABLE IF NOT EXISTS gd_documents (
  collection VARCHAR(60)  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  doc_id     VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  data       LONGTEXT     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  version    INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL,
  updated_at DATETIME     NOT NULL,
  PRIMARY KEY (collection, doc_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_collection_rev (
  collection VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  rev        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (collection)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_sessions (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id    VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  created_at DATETIME NOT NULL,
  last_seen  DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (token_hash),
  KEY idx_gd_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gd_login_attempts (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip       VARCHAR(64)  NOT NULL,
  username VARCHAR(100) NOT NULL,
  ts       DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_gd_attempts_ip (ip, ts),
  KEY idx_gd_attempts_user (username, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
