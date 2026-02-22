import os
import json
import psycopg2

SCHEMA = 't_p65563100_joywood_magnets_app'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """Список клиентов, давших согласие с политикой конфиденциальности"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
                pc.id,
                pc.phone,
                r.name,
                pc.policy_version,
                pc.ip_address,
                pc.created_at
            FROM %s.policy_consents pc
            LEFT JOIN %s.registrations r ON r.id = pc.registration_id
            ORDER BY pc.created_at DESC
            LIMIT 500
        """ % (SCHEMA, SCHEMA))
        rows = cur.fetchall()
        consents = [
            {
                'id': r[0],
                'phone': r[1],
                'name': r[2] or '—',
                'policy_version': r[3] or '—',
                'ip': r[4] or '—',
                'created_at': str(r[5]),
            }
            for r in rows
        ]
        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'consents': consents}),
        }
    finally:
        conn.close()
