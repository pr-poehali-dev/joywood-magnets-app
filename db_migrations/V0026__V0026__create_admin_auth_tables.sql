
CREATE TABLE t_p65563100_joywood_magnets_app.admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  force_password_change BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE t_p65563100_joywood_magnets_app.admin_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p65563100_joywood_magnets_app.admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ip TEXT,
  user_agent TEXT,
  revoked BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE t_p65563100_joywood_magnets_app.admin_audit_log (
  id SERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id INTEGER REFERENCES t_p65563100_joywood_magnets_app.admin_users(id),
  action TEXT NOT NULL,
  target TEXT,
  ip TEXT,
  user_agent TEXT
);

CREATE TABLE t_p65563100_joywood_magnets_app.admin_rate_limit (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ
);

CREATE INDEX idx_admin_sessions_expires ON t_p65563100_joywood_magnets_app.admin_sessions(expires_at);
CREATE INDEX idx_admin_rate_limit_key ON t_p65563100_joywood_magnets_app.admin_rate_limit(key, attempt_at);
CREATE INDEX idx_admin_audit_ts ON t_p65563100_joywood_magnets_app.admin_audit_log(ts DESC);
