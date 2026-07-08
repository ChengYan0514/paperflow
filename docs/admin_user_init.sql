CREATE TABLE admin_user (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL CHECK (username ~ '^[A-Za-z0-9_.-]{3,50}$'),
  username_normalized VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'VIEWER')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Replace password_hash with a BCrypt hash generated locally.
INSERT INTO admin_user (username, username_normalized, password_hash, display_name, role)
VALUES ('admin', 'admin', '$2a$10$replace_with_generated_bcrypt_hash', '管理员', 'ADMIN');
