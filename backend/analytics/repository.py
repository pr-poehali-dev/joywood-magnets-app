SCHEMA = 't_p65563100_joywood_magnets_app'


def get_top_clients(cur):
    cur.execute("""
        SELECT
            r.id, r.name, r.phone,
            COUNT(cm.id) AS magnet_count,
            SUM(CASE cm.stars WHEN 1 THEN 150 WHEN 2 THEN 350 WHEN 3 THEN 700 ELSE 0 END) AS collection_value,
            COUNT(CASE WHEN cm.stars = 1 THEN 1 END) AS star1_count,
            COUNT(CASE WHEN cm.stars = 2 THEN 1 END) AS star2_count,
            COUNT(CASE WHEN cm.stars = 3 THEN 1 END) AS star3_count
        FROM %s.registrations r
        LEFT JOIN %s.client_magnets cm ON cm.registration_id = r.id
        GROUP BY r.id, r.name, r.phone
        HAVING COUNT(cm.id) > 0
        ORDER BY magnet_count DESC, collection_value DESC
        LIMIT 20
    """ % (SCHEMA, SCHEMA))
    return cur.fetchall()


def get_stars_distribution(cur):
    cur.execute("""
        SELECT stars, COUNT(*) AS cnt
        FROM %s.client_magnets
        GROUP BY stars
        ORDER BY stars
    """ % SCHEMA)
    return cur.fetchall()
