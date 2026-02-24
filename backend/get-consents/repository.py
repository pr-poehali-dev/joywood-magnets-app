SCHEMA = 't_p65563100_joywood_magnets_app'
PAGE_SIZE = 50


def get_consents(cur, page=1):
    offset = (page - 1) * PAGE_SIZE
    cur.execute(
        "SELECT COUNT(*) FROM %s.policy_consents" % SCHEMA
    )
    total = cur.fetchone()[0]
    cur.execute("""
        SELECT
            pc.id, pc.phone, r.name,
            pc.policy_version, pc.ip_address, pc.created_at
        FROM %s.policy_consents pc
        LEFT JOIN %s.registrations r ON r.id = pc.registration_id
        ORDER BY pc.created_at DESC
        LIMIT %d OFFSET %d
    """ % (SCHEMA, SCHEMA, PAGE_SIZE, offset))
    return cur.fetchall(), total