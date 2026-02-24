SCHEMA = 't_p65563100_joywood_magnets_app'


def get_all(cur):
    cur.execute("SELECT key, value FROM %s.settings" % SCHEMA)
    return {row[0]: row[1] for row in cur.fetchall()}


def upsert(cur, key, value):
    cur.execute(
        "INSERT INTO %s.settings (key, value, updated_at) VALUES (%%s, %%s, NOW()) "
        "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()" % SCHEMA,
        (key, str(value)),
    )
