import json
import os
import psycopg2


def handler(event, context):
    """POST — выдать магнит / обновить остатки. GET — магниты клиента / остатки всех пород."""
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
    params = event.get('queryStringParameters') or {}

    if method == 'GET' and params.get('action') == 'inventory':
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        try:
            cur = conn.cursor()
            cur.execute("SELECT breed, stars, category, stock FROM magnet_inventory ORDER BY stars, breed")
            rows = cur.fetchall()
            inventory = {}
            for row in rows:
                inventory[row[0]] = {'stars': row[1], 'category': row[2], 'stock': row[3]}
            return {
                'statusCode': 200, 'headers': cors,
                'body': json.dumps({'inventory': inventory}, ensure_ascii=False),
            }
        finally:
            conn.close()

    if method == 'GET':
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
                "SELECT id, breed, stars, category, given_at, order_id FROM client_magnets "
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
                    'order_id': row[5],
                })
            return {
                'statusCode': 200, 'headers': cors,
                'body': json.dumps({'magnets': magnets}, ensure_ascii=False),
            }
        finally:
            conn.close()

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        items = body.get('items')
        if not items or not isinstance(items, list):
            return {
                'statusCode': 400, 'headers': cors,
                'body': json.dumps({'error': 'Укажите items — массив {breed, stars, category, stock}'}, ensure_ascii=False),
            }
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        try:
            cur = conn.cursor()
            for item in items:
                breed = (item.get('breed') or '').strip()
                stars = int(item.get('stars', 1))
                category = (item.get('category') or '').strip()
                stock = int(item.get('stock', 0))
                if not breed:
                    continue
                cur.execute(
                    "INSERT INTO magnet_inventory (breed, stars, category, stock, updated_at) "
                    "VALUES ('%s', %d, '%s', %d, now()) "
                    "ON CONFLICT (breed) DO UPDATE SET stock = %d, updated_at = now()"
                    % (breed.replace("'", "''"), stars, category.replace("'", "''"), stock, stock)
                )
            conn.commit()
            return {
                'statusCode': 200, 'headers': cors,
                'body': json.dumps({'ok': True, 'updated': len(items)}, ensure_ascii=False),
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

            cur.execute(
                "SELECT stock FROM magnet_inventory WHERE breed = '%s'"
                % breed.replace("'", "''")
            )
            inv_row = cur.fetchone()
            current_stock = inv_row[0] if inv_row else 0
            if inv_row and current_stock <= 0:
                return {
                    'statusCode': 400, 'headers': cors,
                    'body': json.dumps({'error': 'Магнит «%s» закончился на складе (остаток: 0)' % breed}, ensure_ascii=False),
                }

            phone = reg[1] or ''
            cur.execute(
                "SELECT id FROM orders WHERE registration_id = %d ORDER BY created_at DESC LIMIT 1"
                % int(registration_id)
            )
            order_row = cur.fetchone()
            last_order_id = order_row[0] if order_row else None
            order_id_sql = str(last_order_id) if last_order_id else 'NULL'

            cur.execute(
                "INSERT INTO client_magnets (registration_id, phone, breed, stars, category, order_id) "
                "VALUES (%d, '%s', '%s', %d, '%s', %s) RETURNING id, given_at"
                % (
                    int(registration_id),
                    phone.replace("'", "''"),
                    breed.replace("'", "''"),
                    int(stars),
                    category.replace("'", "''"),
                    order_id_sql,
                )
            )
            row = cur.fetchone()

            if inv_row:
                cur.execute(
                    "UPDATE magnet_inventory SET stock = stock - 1, updated_at = now() "
                    "WHERE breed = '%s' AND stock > 0"
                    % breed.replace("'", "''")
                )

            conn.commit()
            return {
                'statusCode': 200, 'headers': cors,
                'body': json.dumps({
                    'id': row[0],
                    'given_at': str(row[1]),
                    'breed': breed,
                    'stars': int(stars),
                    'stock_after': max(current_stock - 1, 0) if inv_row else None,
                }, ensure_ascii=False),
            }
        finally:
            conn.close()

    return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}