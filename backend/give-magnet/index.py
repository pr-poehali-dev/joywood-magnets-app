import json
import os
import psycopg2


def handler(event, context):
    """POST — выдать магнит клиенту. GET — получить магниты клиента по registration_id."""
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
    method = event.get('httpMethod')

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        reg_id = params.get('registration_id')
        if not reg_id:
            return {
                'statusCode': 400, 'headers': cors,
                'body': json.dumps({'error': 'Укажите registration_id'}, ensure_ascii=False),
            }
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, breed, stars, category, given_at FROM client_magnets "
                "WHERE registration_id = %d ORDER BY given_at DESC"
                % int(reg_id)
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
            return {
                'statusCode': 200, 'headers': cors,
                'body': json.dumps({'magnets': magnets}, ensure_ascii=False),
            }
        finally:
            conn.close()

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        registration_id = body.get('registration_id')
        breed = (body.get('breed') or '').strip()
        stars = body.get('stars')
        category = (body.get('category') or '').strip()

        if not registration_id or not breed or not stars or not category:
            return {
                'statusCode': 400, 'headers': cors,
                'body': json.dumps({'error': 'Укажите registration_id, breed, stars и category'}, ensure_ascii=False),
            }

        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, phone FROM registrations WHERE id = %d" % int(registration_id))
            reg = cur.fetchone()
            if not reg:
                return {
                    'statusCode': 404, 'headers': cors,
                    'body': json.dumps({'error': 'Клиент не найден'}, ensure_ascii=False),
                }

            phone = reg[1] or ''
            cur.execute(
                "INSERT INTO client_magnets (registration_id, phone, breed, stars, category) "
                "VALUES (%d, '%s', '%s', %d, '%s') RETURNING id, given_at"
                % (
                    int(registration_id),
                    phone.replace("'", "''"),
                    breed.replace("'", "''"),
                    int(stars),
                    category.replace("'", "''"),
                )
            )
            row = cur.fetchone()
            conn.commit()
            return {
                'statusCode': 200, 'headers': cors,
                'body': json.dumps({
                    'id': row[0],
                    'given_at': str(row[1]),
                    'breed': breed,
                    'stars': int(stars),
                }, ensure_ascii=False),
            }
        finally:
            conn.close()

    return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}
