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

CREATE TABLE admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT,
  actor_username VARCHAR(50),
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id VARCHAR(255),
  result VARCHAR(20) NOT NULL,
  request_id VARCHAR(80),
  remote_addr VARCHAR(100),
  user_agent VARCHAR(500),
  message VARCHAR(1000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_actor ON admin_audit_log(actor_username);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);

-- Default bootstrap account: admin / admin. Replace after first login.
INSERT INTO admin_user (username, username_normalized, password_hash, display_name, role)
VALUES ('admin', 'admin', '$2a$10$KZXsR.O6CtLkvpqIFJHi.OXgJwbqzXqRm5vz/hYXxSdT5tLupm9Wy', '管理员', 'SUPER_ADMIN');
