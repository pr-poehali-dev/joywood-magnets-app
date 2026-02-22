ALTER TABLE t_p65563100_joywood_magnets_app.magnet_inventory
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;