SCHEMA = 't_p65563100_joywood_magnets_app'
CV_FORMULA = "COALESCE(SUM(CASE cm2.stars WHEN 1 THEN 150 WHEN 2 THEN 350 WHEN 3 THEN 700 ELSE 0 END), 0)"


def find_registration_by_phone(cur, digits_10):
    cur.execute(
        "SELECT r.id, r.name, r.phone FROM %s.registrations r "
        "WHERE regexp_replace(r.phone, '\\D', '', 'g') LIKE '%%%s%%' LIMIT 1"
        % (SCHEMA, digits_10)
    )
    return cur.fetchone()


def log_not_found(cur, raw_phone):
    cur.execute(
        "INSERT INTO %s.lookup_log (phone, event, details) VALUES ('%s', 'not_found', NULL)"
        % (SCHEMA, raw_phone.replace("'", "''"))
    )


def get_setting(cur, key):
    cur.execute(
        "SELECT value FROM %s.settings WHERE key = '%s'" % (SCHEMA, key.replace("'", "''"))
    )
    row = cur.fetchone()
    return row[0] if row else None


def has_consent(cur, registration_id):
    cur.execute(
        "SELECT id FROM %s.policy_consents "
        "WHERE registration_id = %d ORDER BY created_at DESC LIMIT 1"
        % (SCHEMA, registration_id)
    )
    return cur.fetchone() is not None


def get_all_magnets(cur, registration_id):
    cur.execute(
        "SELECT id, breed, stars, category, given_at, status FROM %s.client_magnets "
        "WHERE registration_id = %d ORDER BY given_at DESC" % (SCHEMA, registration_id)
    )
    return cur.fetchall()


def get_inactive_breeds(cur):
    cur.execute("SELECT breed FROM %s.magnet_inventory WHERE active = false" % SCHEMA)
    return set(r[0] for r in cur.fetchall())


def get_bonuses(cur, registration_id):
    cur.execute(
        "SELECT id, milestone_count, milestone_type, reward, given_at FROM %s.bonuses "
        "WHERE registration_id = %d ORDER BY given_at DESC" % (SCHEMA, registration_id)
    )
    return cur.fetchall()


def get_all_rating_stats(cur):
    cur.execute("""
        SELECT r2.id, COUNT(cm2.id) AS total_magnets, %s AS collection_value,
               MAX(cm2.given_at) AS last_magnet_at
        FROM %s.registrations r2
        LEFT JOIN %s.client_magnets cm2
            ON cm2.registration_id = r2.id AND cm2.status = 'revealed'
        WHERE r2.registered = true
        GROUP BY r2.id
    """ % (CV_FORMULA, SCHEMA, SCHEMA))
    return cur.fetchall()


def get_top_by_magnets(cur):
    cur.execute("""
        SELECT r2.id, r2.name, COUNT(cm2.id) AS total_magnets, %s AS collection_value
        FROM %s.registrations r2
        LEFT JOIN %s.client_magnets cm2
            ON cm2.registration_id = r2.id AND cm2.status = 'revealed'
        WHERE r2.registered = true
        GROUP BY r2.id, r2.name
        ORDER BY total_magnets DESC, MAX(cm2.given_at) ASC LIMIT 3
    """ % (CV_FORMULA, SCHEMA, SCHEMA))
    return [{'id': r[0], 'name': r[1], 'total_magnets': r[2], 'collection_value': int(r[3])} for r in cur.fetchall()]


def get_top_by_value(cur):
    cur.execute("""
        SELECT r2.id, r2.name, COUNT(cm2.id) AS total_magnets, %s AS collection_value
        FROM %s.registrations r2
        LEFT JOIN %s.client_magnets cm2
            ON cm2.registration_id = r2.id AND cm2.status = 'revealed'
        WHERE r2.registered = true
        GROUP BY r2.id, r2.name
        ORDER BY collection_value DESC, MAX(cm2.given_at) ASC LIMIT 3
    """ % (CV_FORMULA, SCHEMA, SCHEMA))
    return [{'id': r[0], 'name': r[1], 'total_magnets': r[2], 'collection_value': int(r[3])} for r in cur.fetchall()]