import json
import os
import psycopg2


def handler(event, context):
    """Менеджер добавляет клиента или оформляет заказ по номеру"""
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

    if event.get('httpMethod') == 'DELETE':
        params = event.get('queryStringParameters') or {}
        client_id = params.get('id')
        if not client_id or not client_id.isdigit():
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Укажите id клиента'})}
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        try:
            cur = conn.cursor()
            cur.execute("SELECT id FROM registrations WHERE id = %s" % int(client_id))
            if not cur.fetchone():
                return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Клиент не найден'})}
            cur.execute("DELETE FROM client_magnets WHERE registration_id = %s" % int(client_id))
            cur.execute("DELETE FROM registrations WHERE id = %s" % int(client_id))
            conn.commit()
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}
        finally:
            conn.close()

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    if action == 'create_order':
        return _handle_create_order(body, cors)

    return _handle_add_client(body, cors)


def _handle_create_order(body, cors):
    order_number = (body.get('order_number') or '').strip()
    channel = (body.get('channel') or '').strip() or 'Ozon'

    if not order_number or len(order_number) < 3:
        return {
            'statusCode': 400, 'headers': cors,
            'body': json.dumps({'error': 'Укажите номер заказа (минимум 3 символа)'}, ensure_ascii=False),
        }

    prefix = order_number.split('-')[0].strip()

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()

        cur.execute(
            "SELECT id, name, phone, ozon_order_code FROM registrations "
            "WHERE ozon_order_code IS NOT NULL "
            "AND split_part(ozon_order_code, '-', 1) = '%s' "
            "ORDER BY id LIMIT 1"
            % prefix.replace("'", "''")
        )
        row = cur.fetchone()

        if row:
            client_id = row[0]
            existing_code = row[3] or ''
            if order_number not in existing_code:
                codes = existing_code + ', ' + order_number if existing_code else order_number
                cur.execute(
                    "UPDATE registrations SET ozon_order_code = '%s' WHERE id = %d"
                    % (codes.replace("'", "''"), client_id)
                )
                conn.commit()

            return {
                'statusCode': 200,
                'headers': cors,
                'body': json.dumps({
                    'client_id': client_id,
                    'client_name': row[1],
                    'is_new': False,
                    'message': 'Заказ добавлен к существующему клиенту',
                }, ensure_ascii=False),
            }
        else:
            client_name = 'Клиент ' + prefix
            cur.execute(
                "INSERT INTO registrations (name, phone, channel, ozon_order_code, registered) "
                "VALUES ('%s', '', '%s', '%s', FALSE) RETURNING id"
                % (
                    client_name.replace("'", "''"),
                    channel.replace("'", "''"),
                    order_number.replace("'", "''"),
                )
            )
            new_id = cur.fetchone()[0]
            conn.commit()

            return {
                'statusCode': 200,
                'headers': cors,
                'body': json.dumps({
                    'client_id': new_id,
                    'client_name': client_name,
                    'is_new': True,
                    'message': 'Создан новый клиент',
                }, ensure_ascii=False),
            }
    finally:
        conn.close()


def _handle_add_client(body, cors):
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    channel = (body.get('channel') or '').strip()
    ozon_order_code = (body.get('ozon_order_code') or '').strip() or None

    has_full_data = len(name) >= 2 and len(phone) >= 6 and channel
    has_ozon_code = ozon_order_code and len(ozon_order_code) >= 3

    if not has_full_data and not has_ozon_code:
        return {
            'statusCode': 400,
            'headers': cors,
            'body': json.dumps({'error': 'Укажите код заказа Ozon или полные данные клиента'}, ensure_ascii=False),
        }

    registered = has_full_data

    if not channel and has_ozon_code:
        channel = 'Ozon'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO registrations (name, phone, channel, ozon_order_code, registered) "
            "VALUES ('%s', '%s', '%s', %s, %s) RETURNING id, created_at"
            % (
                name.replace("'", "''"),
                phone.replace("'", "''"),
                channel.replace("'", "''"),
                "'" + ozon_order_code.replace("'", "''") + "'" if ozon_order_code else 'NULL',
                'TRUE' if registered else 'FALSE',
            )
        )
        row = cur.fetchone()
        conn.commit()
        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({
                'id': row[0],
                'created_at': str(row[1]),
                'registered': registered,
            }, ensure_ascii=False),
        }
    finally:
        conn.close()
