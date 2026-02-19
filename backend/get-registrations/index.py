import json
import os
import psycopg2


def handler(event, context):
    """Получение клиентов и заказов"""
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

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    if action == 'orders':
        return _get_orders(params, cors)

    if action == 'client_orders':
        return _get_client_orders(params, cors)

    if action == 'recent_registrations':
        return _get_recent_registrations(cors)

    return _get_clients(cors)


def _get_clients(cors):
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT r.id, r.name, r.phone, r.channel, r.ozon_order_code, r.created_at, r.registered, "
            "COALESCE(SUM(o.amount), 0) as total_amount, "
            "array_remove(array_agg(DISTINCT o.channel), NULL) as channels "
            "FROM registrations r "
            "LEFT JOIN orders o ON o.registration_id = r.id "
            "GROUP BY r.id ORDER BY r.created_at DESC"
        )
        rows = cur.fetchall()
        clients = []
        for row in rows:
            clients.append({
                'id': row[0],
                'name': row[1],
                'phone': row[2],
                'channel': row[3],
                'ozon_order_code': row[4],
                'created_at': str(row[5]),
                'registered': bool(row[6]),
                'total_amount': float(row[7]),
                'channels': row[8] or [],
            })
        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({'clients': clients}, ensure_ascii=False),
        }
    finally:
        conn.close()


def _get_recent_registrations(cors):
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT r.id, r.name, r.phone, r.channel, r.registered, r.created_at, "
            "COALESCE(SUM(o.amount), 0) as total_amount, "
            "COUNT(o.id) as orders_count "
            "FROM registrations r "
            "LEFT JOIN orders o ON o.registration_id = r.id "
            "WHERE r.registered = TRUE "
            "GROUP BY r.id "
            "ORDER BY r.created_at DESC "
            "LIMIT 50"
        )
        rows = cur.fetchall()
        items = []
        for row in rows:
            items.append({
                'id': row[0],
                'name': row[1],
                'phone': row[2],
                'channel': row[3],
                'registered': bool(row[4]),
                'created_at': str(row[5]),
                'total_amount': float(row[6]),
                'orders_count': int(row[7]),
            })
        return {
            'statusCode': 200, 'headers': cors,
            'body': json.dumps({'registrations': items}, ensure_ascii=False),
        }
    finally:
        conn.close()


def _get_orders(params, cors):
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT o.id, o.order_code, o.amount, o.channel, o.status, o.created_at, "
            "o.registration_id, r.name, r.phone "
            "FROM orders o "
            "LEFT JOIN registrations r ON r.id = o.registration_id "
            "ORDER BY o.created_at DESC LIMIT 200"
        )
        rows = cur.fetchall()
        orders = []
        for row in rows:
            orders.append({
                'id': row[0],
                'order_code': row[1] or '',
                'amount': float(row[2]) if row[2] else 0,
                'channel': row[3],
                'status': row[4],
                'created_at': str(row[5]),
                'registration_id': row[6],
                'client_name': row[7] or '',
                'client_phone': row[8] or '',
            })
        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({'orders': orders}, ensure_ascii=False),
        }
    finally:
        conn.close()


def _get_client_orders(params, cors):
    reg_id = params.get('registration_id', '')
    if not reg_id or not reg_id.isdigit():
        return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'registration_id required'})}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, order_code, amount, channel, status, created_at "
            "FROM orders WHERE registration_id = %d "
            "ORDER BY created_at DESC"
            % int(reg_id)
        )
        rows = cur.fetchall()
        orders = []
        for row in rows:
            orders.append({
                'id': row[0],
                'order_code': row[1] or '',
                'amount': float(row[2]) if row[2] else 0,
                'channel': row[3],
                'status': row[4],
                'created_at': str(row[5]),
            })
        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({'orders': orders}, ensure_ascii=False),
        }
    finally:
        conn.close()