
CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    channel VARCHAR(100) NOT NULL,
    ozon_order_code VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_registrations_phone ON registrations(phone);
CREATE INDEX idx_registrations_channel ON registrations(channel);
