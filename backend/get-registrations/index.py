import json
import os
import psycopg2
# reload env


def handler(event, context):
    """Получение клиентов, заказов и аналитики регистраций"""
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

    if action == 'registration_stats':
        return _get_registration_stats(cors)

    if action == 'check_password':
        return _check_password(params, cors)

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


def _check_password(params, cors):
    """Проверка пароля администратора"""
    entered = params.get('password', '')
    expected = os.environ.get('ADMIN_PASSWORD', '')
    if entered and entered == expected:
        return {'statusCode': 200, 'headers': cors, 'body': '{"ok": true}'}
    return {'statusCode': 403, 'headers': cors, 'body': '{"ok": false}'}


def _get_registration_stats(cors):
    """Статистика регистраций по дням за последние 30 дней"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT DATE(created_at) as day, "
            "SUM(CASE WHEN channel = 'ozon' THEN 1 ELSE 0 END) as ozon, "
            "SUM(CASE WHEN channel != 'ozon' OR channel IS NULL THEN 1 ELSE 0 END) as other "
            "FROM registrations "
            "WHERE registered = TRUE AND created_at >= NOW() - INTERVAL '30 days' "
            "GROUP BY day ORDER BY day ASC"
        )
        rows = cur.fetchall()
        daily = []
        for row in rows:
            daily.append({
                'date': str(row[0]),
                'ozon': int(row[1]),
                'other': int(row[2]),
                'total': int(row[1]) + int(row[2]),
            })

        cur.execute(
            "SELECT COUNT(*) as total, "
            "SUM(CASE WHEN channel = 'ozon' THEN 1 ELSE 0 END) as ozon, "
            "SUM(CASE WHEN channel != 'ozon' OR channel IS NULL THEN 1 ELSE 0 END) as other, "
            "SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END) as today, "
            "SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as this_week "
            "FROM registrations WHERE registered = TRUE"
        )
        r = cur.fetchone()
        summary = {
            'total': int(r[0]),
            'ozon': int(r[1]),
            'other': int(r[2]),
            'today': int(r[3]),
            'this_week': int(r[4]),
        }
        return {
            'statusCode': 200, 'headers': cors,
            'body': json.dumps({'daily': daily, 'summary': summary}, ensure_ascii=False),
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