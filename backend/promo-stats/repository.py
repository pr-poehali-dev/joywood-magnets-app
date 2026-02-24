SCHEMA = 't_p65563100_joywood_magnets_app'


def get_promo_stats(cur):
    cur.execute("""
        SELECT
            COUNT(DISTINCT r.id) AS participants,
            COUNT(cm.id) AS total_magnets
        FROM %s.registrations r
        LEFT JOIN %s.client_magnets cm ON cm.registration_id = r.id
        WHERE r.registered = true
    """ % (SCHEMA, SCHEMA))
    return cur.fetchone()
