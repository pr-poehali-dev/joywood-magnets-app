ALTER TABLE t_p65563100_joywood_magnets_app.orders ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE t_p65563100_joywood_magnets_app.registrations ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE t_p65563100_joywood_magnets_app.client_magnets ADD COLUMN IF NOT EXISTS created_by TEXT;