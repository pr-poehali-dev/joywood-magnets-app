import os
from utils import OPTIONS_RESPONSE, ok, err, db


def handler(event, context):
    """Получение клиентов, заказов и аналитики регистраций"""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    if action == 'orders':
        return _get_orders()

    if action == 'client_orders':
        return _get_client_orders(params)

    if action == 'recent_registrations':
        return _get_recent_registrations()

    if action == 'registration_stats':
        return _get_registration_stats()

    if action == 'check_password':
        return _check_password(params)

    if action == 'list':
        return _get_registrations_list()

    return _get_clients()


def _get_clients():
    conn = db()
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
        clients = [
            {
                'id': row[0], 'name': row[1], 'phone': row[2], 'channel': row[3],
                'ozon_order_code': row[4], 'created_at': str(row[5]),
                'registered': bool(row[6]), 'total_amount': float(row[7]), 'channels': row[8] or [],
            }
            for row in rows
        ]
        return ok({'clients': clients})
    finally:
        conn.close()


def _get_registrations_list():
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, phone, registered FROM registrations ORDER BY created_at DESC")
        rows = cur.fetchall()
        return ok({'registrations': [
            {'id': r[0], 'name': r[1], 'phone': r[2], 'registered': bool(r[3])}
            for r in rows
        ]})
    finally:
        conn.close()


def _check_password(params):
    entered = params.get('password', '')
    expected = os.environ.get('ADMIN_PASSWORD', '')
    if entered and entered == expected:
        return ok({'ok': True})
    return err('Неверный пароль', 403)


def _get_registration_stats():
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT DATE(created_at) as day, "
            "SUM(CASE WHEN LOWER(channel) = 'ozon' THEN 1 ELSE 0 END) as ozon "
            "FROM registrations "
            "WHERE registered = TRUE AND LOWER(channel) = 'ozon' "
            "AND created_at >= NOW() - INTERVAL '30 days' "
            "GROUP BY day ORDER BY day ASC"
        )
        daily = [{'date': str(r[0]), 'ozon': int(r[1]), 'total': int(r[1])} for r in cur.fetchall()]

        cur.execute(
            "SELECT "
            "SUM(CASE WHEN LOWER(channel) = 'ozon' THEN 1 ELSE 0 END) as ozon, "
            "SUM(CASE WHEN LOWER(channel) = 'ozon' AND DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END) as today, "
            "SUM(CASE WHEN LOWER(channel) = 'ozon' AND created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as this_week "
            "FROM registrations WHERE registered = TRUE"
        )
        r = cur.fetchone()
        summary = {'ozon': int(r[0] or 0), 'today': int(r[1] or 0), 'this_week': int(r[2] or 0)}
        return ok({'daily': daily, 'summary': summary})
    finally:
        conn.close()


def _get_recent_registrations():
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT r.id, r.name, r.phone, r.channel, r.registered, r.created_at, "
            "COALESCE(SUM(o.amount), 0) as total_amount, COUNT(o.id) as orders_count "
            "FROM registrations r "
            "LEFT JOIN orders o ON o.registration_id = r.id "
            "WHERE r.registered = TRUE AND LOWER(r.channel) = 'ozon' "
            "GROUP BY r.id ORDER BY r.created_at DESC"
        )
        items = [
            {
                'id': r[0], 'name': r[1], 'phone': r[2], 'channel': r[3],
                'registered': bool(r[4]), 'created_at': str(r[5]),
                'total_amount': float(r[6]), 'orders_count': int(r[7]),
            }
            for r in cur.fetchall()
        ]
        return ok({'registrations': items})
    finally:
        conn.close()


def _get_orders():
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT o.id, o.order_code, o.amount, o.channel, o.status, o.created_at, "
            "o.registration_id, r.name, r.phone, o.magnet_comment "
            "FROM orders o "
            "LEFT JOIN registrations r ON r.id = o.registration_id "
            "ORDER BY o.created_at DESC"
        )
        orders = [
            {
                'id': r[0], 'order_code': r[1] or '', 'amount': float(r[2]) if r[2] else 0,
                'channel': r[3], 'status': r[4], 'created_at': str(r[5]),
                'registration_id': r[6], 'client_name': r[7] or '',
                'client_phone': r[8] or '', 'magnet_comment': r[9] or '',
            }
            for r in cur.fetchall()
        ]
        return ok({'orders': orders})
    finally:
        conn.close()


def _get_client_orders(params):
    reg_id = params.get('registration_id', '')
    if not reg_id or not reg_id.isdigit():
        return err('registration_id required')

    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, order_code, amount, channel, status, created_at, magnet_comment "
            "FROM orders WHERE registration_id = %d ORDER BY created_at DESC"
            % int(reg_id)
        )
        orders = [
            {
                'id': r[0], 'order_code': r[1] or '', 'amount': float(r[2]) if r[2] else 0,
                'channel': r[3], 'status': r[4], 'created_at': str(r[5]), 'magnet_comment': r[6] or '',
            }
            for r in cur.fetchall()
        ]
        return ok({'orders': orders})
    finally:
        conn.close()
