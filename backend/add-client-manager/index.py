import json
import os
import psycopg2


def handler(event, context):
    """Управление клиентами и заказами: добавление, редактирование, удаление, оформление заказов"""
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
        if params.get('order_id'):
            return _handle_delete_order(params, cors)
        return _handle_delete(event, cors)

    if event.get('httpMethod') == 'PUT':
        body = json.loads(event.get('body') or '{}')
        return _handle_update_client(body, cors)

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    if action == 'create_order':
        return _handle_create_order(body, cors)

    return _handle_add_client(body, cors)


def _handle_delete_order(params, cors):
    order_id = params.get('order_id')
    if not order_id or not str(order_id).isdigit():
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Укажите order_id'}, ensure_ascii=False)}
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM orders WHERE id = %d" % int(order_id))
        if not cur.fetchone():
            return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Заказ не найден'}, ensure_ascii=False)}

        cur.execute(
            "SELECT id, breed FROM client_magnets WHERE order_id = %d" % int(order_id)
        )
        magnet = cur.fetchone()

        if magnet:
            cur.execute("UPDATE magnet_inventory SET stock = stock + 1, updated_at = now() WHERE breed = '%s'" % magnet[1].replace("'", "''"))
            cur.execute("DELETE FROM client_magnets WHERE id = %d" % magnet[0])

        cur.execute("DELETE FROM orders WHERE id = %d" % int(order_id))
        conn.commit()

        return {
            'statusCode': 200, 'headers': cors,
            'body': json.dumps({
                'ok': True,
                'magnet_removed': magnet is not None,
                'magnet_breed': magnet[1] if magnet else None,
            }, ensure_ascii=False),
        }
    finally:
        conn.close()


def _handle_delete(event, cors):
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
        cur.execute("DELETE FROM orders WHERE registration_id = %s" % int(client_id))
        cur.execute("DELETE FROM registrations WHERE id = %s" % int(client_id))
        conn.commit()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}
    finally:
        conn.close()


def _handle_update_client(body, cors):
    client_id = body.get('id')
    if not client_id:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Укажите id клиента'}, ensure_ascii=False)}

    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()

    if not name and not phone:
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Укажите имя или телефон'}, ensure_ascii=False)}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM registrations WHERE id = %s" % int(client_id))
        if not cur.fetchone():
            return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Клиент не найден'}, ensure_ascii=False)}

        updates = []
        if name:
            updates.append("name = '%s'" % name.replace("'", "''"))
        if phone:
            updates.append("phone = '%s'" % phone.replace("'", "''"))

        has_real_data = False
        if name and len(name) >= 2:
            has_real_data = True
        if phone and len(phone.replace(' ', '').replace('(', '').replace(')', '').replace('-', '').replace('+', '')) >= 11:
            has_real_data = True

        if has_real_data:
            updates.append("registered = TRUE")

        cur.execute("UPDATE registrations SET %s WHERE id = %s" % (', '.join(updates), int(client_id)))
        conn.commit()

        cur.execute("SELECT id, name, phone, channel, ozon_order_code, registered FROM registrations WHERE id = %s" % int(client_id))
        row = cur.fetchone()

        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({
                'ok': True,
                'client': {
                    'id': row[0],
                    'name': row[1],
                    'phone': row[2],
                    'channel': row[3],
                    'ozon_order_code': row[4],
                    'registered': row[5],
                },
            }, ensure_ascii=False),
        }
    finally:
        conn.close()


def _handle_create_order(body, cors):
    order_number = (body.get('order_number') or '').strip()
    channel = (body.get('channel') or '').strip() or 'Ozon'
    amount = body.get('amount', 0)
    client_id = body.get('client_id')

    try:
        amount = float(amount) if amount else 0
    except (ValueError, TypeError):
        amount = 0

    if client_id:
        return _create_order_for_client(int(client_id), order_number, channel, amount, cors)

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
            cid = row[0]
            existing_code = row[3] or ''
            if order_number not in existing_code:
                codes = existing_code + ', ' + order_number if existing_code else order_number
                cur.execute(
                    "UPDATE registrations SET ozon_order_code = '%s' WHERE id = %d"
                    % (codes.replace("'", "''"), cid)
                )

            cur.execute(
                "INSERT INTO orders (registration_id, order_code, amount, channel) "
                "VALUES (%d, '%s', %s, '%s') RETURNING id, created_at, status"
                % (cid, order_number.replace("'", "''"), amount, channel.replace("'", "''"))
            )
            ord_row = cur.fetchone()
            conn.commit()

            return {
                'statusCode': 200,
                'headers': cors,
                'body': json.dumps({
                    'client_id': cid,
                    'client_name': row[1],
                    'client_phone': row[2] or '',
                    'order_id': ord_row[0],
                    'order_code': order_number,
                    'amount': amount,
                    'channel': channel,
                    'created_at': str(ord_row[1]),
                    'status': ord_row[2] or 'active',
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

            cur.execute(
                "INSERT INTO orders (registration_id, order_code, amount, channel) "
                "VALUES (%d, '%s', %s, '%s') RETURNING id, created_at, status"
                % (new_id, order_number.replace("'", "''"), amount, channel.replace("'", "''"))
            )
            ord_row = cur.fetchone()
            conn.commit()

            return {
                'statusCode': 200,
                'headers': cors,
                'body': json.dumps({
                    'client_id': new_id,
                    'client_name': client_name,
                    'client_phone': '',
                    'order_id': ord_row[0],
                    'order_code': order_number,
                    'amount': amount,
                    'channel': channel,
                    'created_at': str(ord_row[1]),
                    'status': ord_row[2] or 'active',
                    'is_new': True,
                    'message': 'Создан новый клиент',
                }, ensure_ascii=False),
            }
    finally:
        conn.close()


def _create_order_for_client(client_id, order_code, channel, amount, cors):
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM registrations WHERE id = %d" % client_id)
        row = cur.fetchone()
        if not row:
            return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Клиент не найден'}, ensure_ascii=False)}

        cur.execute(
            "INSERT INTO orders (registration_id, order_code, amount, channel) "
            "VALUES (%d, %s, %s, '%s') RETURNING id, created_at, status"
            % (
                client_id,
                ("'" + order_code.replace("'", "''") + "'") if order_code else 'NULL',
                amount,
                channel.replace("'", "''"),
            )
        )
        ord_row = cur.fetchone()
        conn.commit()

        cur.execute("SELECT phone FROM registrations WHERE id = %d" % client_id)
        phone_row = cur.fetchone()

        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({
                'client_id': client_id,
                'client_name': row[1],
                'client_phone': phone_row[0] if phone_row else '',
                'order_id': ord_row[0],
                'order_code': order_code or '',
                'amount': amount,
                'channel': channel,
                'created_at': str(ord_row[1]),
                'status': ord_row[2] or 'active',
                'is_new': False,
                'message': 'Заказ оформлен',
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