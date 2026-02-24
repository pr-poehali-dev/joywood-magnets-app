SCHEMA = 't_p65563100_joywood_magnets_app'


def get_consents(cur):
    cur.execute("""
        SELECT
            pc.id, pc.phone, r.name,
            pc.policy_version, pc.ip_address, pc.created_at
        FROM %s.policy_consents pc
        LEFT JOIN %s.registrations r ON r.id = pc.registration_id
        ORDER BY pc.created_at DESC
        LIMIT 500
    """ % (SCHEMA, SCHEMA))
    return cur.fetchall()
