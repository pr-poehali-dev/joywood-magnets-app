from utils import OPTIONS_RESPONSE, ok, db


def handler(event, context):
    """GET — аналитика: топ клиентов по количеству и стоимости магнитов, распределение по категориям."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    conn = db()
    try:
        cur = conn.cursor()

        # Топ клиентов по количеству магнитов
        cur.execute("""
            SELECT
                r.id,
                r.name,
                r.phone,
                COUNT(cm.id) AS magnet_count,
                SUM(CASE cm.stars WHEN 1 THEN 150 WHEN 2 THEN 350 WHEN 3 THEN 700 ELSE 0 END) AS collection_value,
                COUNT(CASE WHEN cm.stars = 1 THEN 1 END) AS star1_count,
                COUNT(CASE WHEN cm.stars = 2 THEN 1 END) AS star2_count,
                COUNT(CASE WHEN cm.stars = 3 THEN 1 END) AS star3_count
            FROM registrations r
            LEFT JOIN client_magnets cm ON cm.registration_id = r.id
            GROUP BY r.id, r.name, r.phone
            HAVING COUNT(cm.id) > 0
            ORDER BY magnet_count DESC, collection_value DESC
            LIMIT 20
        """)
        rows = cur.fetchall()
        top_by_count = [
            {
                'id': row[0],
                'name': row[1] or '',
                'phone': row[2] or '',
                'magnet_count': int(row[3]),
                'collection_value': int(row[4] or 0),
                'star1': int(row[5]),
                'star2': int(row[6]),
                'star3': int(row[7]),
            }
            for row in rows
        ]

        # Топ клиентов по стоимости коллекции
        top_by_value = sorted(top_by_count, key=lambda x: (-x['collection_value'], -x['magnet_count']))[:20]

        # Распределение магнитов по категориям (всего выдано)
        cur.execute("""
            SELECT stars, COUNT(*) AS cnt
            FROM client_magnets
            GROUP BY stars
            ORDER BY stars
        """)
        dist_rows = cur.fetchall()
        distribution = {str(row[0]): int(row[1]) for row in dist_rows}
        total_given = sum(distribution.values())

        return ok({
            'top_by_count': top_by_count,
            'top_by_value': top_by_value,
            'distribution': distribution,
            'total_given': total_given,
        })
    finally:
        conn.close()