import os
import json
import re
import psycopg2

SCHEMA = 't_p65563100_joywood_magnets_app'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """Сохранение согласия клиента с политикой конфиденциальности"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    phone = (body.get('phone') or '').strip()
    policy_version = (body.get('policy_version') or '').strip()
    user_agent = (body.get('user_agent') or '').strip()[:500]

    digits = re.sub(r'\D', '', phone)
    if len(digits) < 10:
        return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': 'Некорректный телефон'})}

    ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp') or ''

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM %s.registrations "
            "WHERE regexp_replace(phone, '\\D', '', 'g') LIKE '%%%s%%' LIMIT 1" % (SCHEMA, digits[-10:])
        )
        reg = cur.fetchone()
        reg_id = reg[0] if reg else None

        def esc(s):
            return s.replace("'", "''")

        reg_id_sql = str(reg_id) if reg_id else 'NULL'
        cur.execute(
            "INSERT INTO %s.policy_consents (registration_id, phone, policy_version, ip_address, user_agent) "
            "VALUES (%s, '%s', '%s', '%s', '%s')" % (
                SCHEMA,
                reg_id_sql,
                esc(phone),
                esc(policy_version)[:100],
                esc(ip)[:45],
                esc(user_agent[:500]),
            )
        )
        conn.commit()
        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True}),
        }
    finally:
        conn.close()