CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER REFERENCES registrations(id),
    order_code VARCHAR(200),
    amount NUMERIC(12,2) DEFAULT 0,
    channel VARCHAR(100) NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_registration ON orders(registration_id);
CREATE INDEX idx_orders_channel ON orders(channel);
CREATE INDEX idx_orders_created ON orders(created_at);