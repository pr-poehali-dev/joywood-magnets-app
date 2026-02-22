CREATE TABLE IF NOT EXISTS t_p65563100_joywood_magnets_app.lookup_log (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(30),
    event VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lookup_log_created_at
    ON t_p65563100_joywood_magnets_app.lookup_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lookup_log_event
    ON t_p65563100_joywood_magnets_app.lookup_log (event);