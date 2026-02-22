CREATE TABLE t_p65563100_joywood_magnets_app.policy_consents (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER REFERENCES t_p65563100_joywood_magnets_app.registrations(id),
    phone VARCHAR(30),
    policy_version VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_consents_registration_id ON t_p65563100_joywood_magnets_app.policy_consents(registration_id);
CREATE INDEX idx_policy_consents_phone ON t_p65563100_joywood_magnets_app.policy_consents(phone);