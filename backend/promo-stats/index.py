import os
import json
import psycopg2

def handler(event: dict, context) -> dict:
    """GET — публичная статистика промо: количество участников и выданных магнитов."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

    cur.execute("""
        SELECT
            COUNT(DISTINCT r.id) AS participants,
            COUNT(cm.id) AS total_magnets
        FROM t_p65563100_joywood_magnets_app.registrations r
        LEFT JOIN t_p65563100_joywood_magnets_app.client_magnets cm ON cm.registration_id = r.id
        WHERE r.registered = true
    """)
    row = cur.fetchone()
    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({
            'participants': int(row[0]),
            'total_magnets': int(row[1])
        })
    }
