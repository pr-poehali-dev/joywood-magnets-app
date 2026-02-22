ALTER TABLE t_p65563100_joywood_magnets_app.client_magnets
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'revealed';

COMMENT ON COLUMN t_p65563100_joywood_magnets_app.client_magnets.status IS 'in_transit — магнит отправлен, скрыто для клиента; revealed — раскрыт после сканирования QR';

CREATE INDEX IF NOT EXISTS client_magnets_status_idx
ON t_p65563100_joywood_magnets_app.client_magnets(status);
