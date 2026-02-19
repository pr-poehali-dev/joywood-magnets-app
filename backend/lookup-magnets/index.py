import json
import os
import re
import psycopg2


def handler(event, context):
    """Поиск выданных магнитов клиента по номеру телефона"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    cors = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if event.get('httpMethod') != 'POST':
        return {
            'statusCode': 405,
            'headers': cors,
            'body': json.dumps({'error': 'Method not allowed'}),
        }

    body = json.loads(event.get('body', '{}'))
    raw_phone = (body.get('phone') or '').strip()

    digits = re.sub(r'\D', '', raw_phone)
    if len(digits) < 10:
        return {
            'statusCode': 400,
            'headers': cors,
            'body': json.dumps({'error': 'Введите корректный номер телефона'}, ensure_ascii=False),
        }

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()

        like_pattern = '%' + '%'.join(digits[-10:]) + '%'

        cur.execute(
            "SELECT r.id, r.name, r.phone FROM registrations r "
            "WHERE regexp_replace(r.phone, '\\D', '', 'g') LIKE '%%%s%%' "
            "LIMIT 1"
            % digits[-10:]
        )
        reg = cur.fetchone()

        if not reg:
            return {
                'statusCode': 404,
                'headers': cors,
                'body': json.dumps({
                    'error': 'Участник с таким номером не найден. Сначала зарегистрируйтесь в акции.',
                }, ensure_ascii=False),
            }

        cur.execute(
            "SELECT id, breed, stars, category, given_at FROM client_magnets "
            "WHERE registration_id = %d "
            "ORDER BY given_at DESC"
            % reg[0]
        )
        rows = cur.fetchall()

        magnets = []
        for row in rows:
            magnets.append({
                'id': row[0],
                'breed': row[1],
                'stars': row[2],
                'category': row[3],
                'given_at': str(row[4]),
            })

        unique_breeds = len(set(m['breed'] for m in magnets))

        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({
                'client_name': reg[1],
                'phone': reg[2],
                'magnets': magnets,
                'total_magnets': len(magnets),
                'unique_breeds': unique_breeds,
            }, ensure_ascii=False),
        }
    finally:
        conn.close()