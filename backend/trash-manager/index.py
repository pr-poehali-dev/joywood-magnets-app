import json
import os
import psycopg2

SCHEMA = 't_p65563100_joywood_magnets_app'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
}


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def ok(data):
    return {'statusCode': 200, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}


def err(msg, code=400):
    return {'statusCode': code, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def handler(event, context):
    """Управление корзиной: список удалённых клиентов и заказов, восстановление, окончательное удаление"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}

    if method == 'GET':
        return _list_trash()

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action')
        if action == 'restore_client':
            return _restore_client(body.get('client_id'))
        if action == 'restore_order':
            return _restore_order(body.get('order_id'))
        return err('Неизвестное действие')

    if method == 'DELETE':
        if params.get('client_id'):
            return _purge_client(params['client_id'])
        if params.get('order_id'):
            return _purge_order(params['order_id'])
        return err('Укажите client_id или order_id')

    return err('Method not allowed', 405)


def _list_trash():
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT r.id, r.name, r.phone, r.channel, r.removed_at, "
            "COUNT(o.id) FILTER (WHERE o.removed_at IS NOT NULL) AS removed_orders "
            "FROM %s.registrations r "
            "LEFT JOIN %s.orders o ON o.registration_id = r.id "
            "WHERE r.removed_at IS NOT NULL "
            "GROUP BY r.id ORDER BY r.removed_at DESC" % (SCHEMA, SCHEMA)
        )
        clients = [
            {'id': row[0], 'name': row[1], 'phone': row[2] or '', 'channel': row[3] or '',
             'removed_at': str(row[4]), 'removed_orders': row[5]}
            for row in cur.fetchall()
        ]
        cur.execute(
            "SELECT o.id, o.order_code, o.amount, o.channel, o.removed_at, "
            "r.id AS client_id, r.name AS client_name "
            "FROM %s.orders o "
            "JOIN %s.registrations r ON r.id = o.registration_id "
            "WHERE o.removed_at IS NOT NULL AND r.removed_at IS NULL "
            "ORDER BY o.removed_at DESC" % (SCHEMA, SCHEMA)
        )
        orders = [
            {'id': row[0], 'order_code': row[1] or '', 'amount': float(row[2] or 0),
             'channel': row[3] or '', 'removed_at': str(row[4]),
             'client_id': row[5], 'client_name': row[6]}
            for row in cur.fetchall()
        ]
        return ok({'clients': clients, 'orders': orders})
    finally:
        conn.close()


def _restore_client(client_id):
    if not client_id or not str(client_id).isdigit():
        return err('Укажите client_id')
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE %s.registrations SET removed_at = NULL WHERE id = %d AND removed_at IS NOT NULL RETURNING id"
            % (SCHEMA, int(client_id))
        )
        if not cur.fetchone():
            return err('Клиент не найден в корзине', 404)
        cur.execute(
            "UPDATE %s.orders SET removed_at = NULL WHERE registration_id = %d AND removed_at IS NOT NULL"
            % (SCHEMA, int(client_id))
        )
        conn.commit()
        return ok({'ok': True})
    finally:
        conn.close()


def _restore_order(order_id):
    if not order_id or not str(order_id).isdigit():
        return err('Укажите order_id')
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE %s.orders SET removed_at = NULL WHERE id = %d AND removed_at IS NOT NULL RETURNING id"
            % (SCHEMA, int(order_id))
        )
        if not cur.fetchone():
            return err('Заказ не найден в корзине', 404)
        conn.commit()
        return ok({'ok': True})
    finally:
        conn.close()


def _purge_client(client_id):
    if not str(client_id).isdigit():
        return err('Укажите client_id')
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM %s.registrations WHERE id = %d AND removed_at IS NOT NULL"
            % (SCHEMA, int(client_id))
        )
        if not cur.fetchone():
            return err('Клиент не найден в корзине', 404)
        for table in ('client_magnets', 'bonuses', 'policy_consents'):
            cur.execute(
                "DELETE FROM %s.%s WHERE registration_id = %d" % (SCHEMA, table, int(client_id))
            )
        cur.execute("DELETE FROM %s.orders WHERE registration_id = %d" % (SCHEMA, int(client_id)))
        cur.execute("DELETE FROM %s.registrations WHERE id = %d" % (SCHEMA, int(client_id)))
        conn.commit()
        return ok({'ok': True})
    finally:
        conn.close()


def _purge_order(order_id):
    if not str(order_id).isdigit():
        return err('Укажите order_id')
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM %s.orders WHERE id = %d AND removed_at IS NOT NULL"
            % (SCHEMA, int(order_id))
        )
        if not cur.fetchone():
            return err('Заказ не найден в корзине', 404)
        cur.execute("DELETE FROM %s.client_magnets WHERE order_id = %d" % (SCHEMA, int(order_id)))
        cur.execute("DELETE FROM %s.bonuses WHERE order_id = %d" % (SCHEMA, int(order_id)))
        cur.execute("DELETE FROM %s.orders WHERE id = %d" % (SCHEMA, int(order_id)))
        conn.commit()
        return ok({'ok': True})
    finally:
        conn.close()
