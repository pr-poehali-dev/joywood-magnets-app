INSERT INTO t_p65563100_joywood_magnets_app.admin_users (email, password_hash, role, is_active, force_password_change)
VALUES ('linum11@yandex.ru', 'TEMP', 'admin', true, false)
ON CONFLICT (email) DO NOTHING;