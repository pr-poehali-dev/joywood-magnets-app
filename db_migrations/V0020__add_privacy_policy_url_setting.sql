INSERT INTO t_p65563100_joywood_magnets_app.settings (key, value, updated_at)
VALUES ('privacy_policy_url', '', NOW())
ON CONFLICT (key) DO NOTHING;