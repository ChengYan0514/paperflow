CREATE TABLE admin_user (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL CHECK (username ~ '^[A-Za-z0-9_.-]{3,50}$'),
  username_normalized VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Default bootstrap account: admin / admin. Replace after first login.
INSERT INTO admin_user (username, username_normalized, password_hash, display_name, role)
VALUES ('admin', 'admin', '$2a$10$KZXsR.O6CtLkvpqIFJHi.OXgJwbqzXqRm5vz/hYXxSdT5tLupm9Wy', '管理员', 'SUPER_ADMIN');
