CREATE TABLE IF NOT EXISTS t_p65563100_joywood_magnets_app.settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO t_p65563100_joywood_magnets_app.settings (key, value)
VALUES ('phone_verification_enabled', 'true')
ON CONFLICT (key) DO NOTHING;