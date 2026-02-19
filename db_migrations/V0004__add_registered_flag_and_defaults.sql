
ALTER TABLE registrations ADD COLUMN registered BOOLEAN DEFAULT FALSE;
ALTER TABLE registrations ALTER COLUMN name SET DEFAULT '';
ALTER TABLE registrations ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE registrations ALTER COLUMN channel SET DEFAULT '';

UPDATE registrations SET registered = TRUE WHERE phone IS NOT NULL AND phone != '';
