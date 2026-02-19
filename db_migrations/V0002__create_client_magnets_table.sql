
CREATE TABLE client_magnets (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER REFERENCES registrations(id),
    phone VARCHAR(50) NOT NULL,
    breed VARCHAR(100) NOT NULL,
    stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 3),
    category VARCHAR(50) NOT NULL,
    given_at TIMESTAMP DEFAULT NOW(),
    given_by VARCHAR(255) DEFAULT 'manager'
);

CREATE INDEX idx_client_magnets_phone ON client_magnets(phone);
CREATE INDEX idx_client_magnets_registration ON client_magnets(registration_id);
