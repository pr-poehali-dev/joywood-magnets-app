CREATE TABLE IF NOT EXISTS t_p65563100_joywood_magnets_app.bonuses (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER NOT NULL,
  milestone_count INTEGER NOT NULL,
  milestone_type VARCHAR(20) NOT NULL,
  reward TEXT NOT NULL,
  given_at TIMESTAMP DEFAULT now(),
  given_by VARCHAR(100) DEFAULT 'manager',
  CONSTRAINT bonuses_unique UNIQUE (registration_id, milestone_count, milestone_type)
);