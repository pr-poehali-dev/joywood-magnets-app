import os
from utils import OPTIONS_RESPONSE, ok, err, db
import repository as repo


def handler(event, context):
    """Получение клиентов, заказов и аналитики регистраций"""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    if action == 'orders':
        return _get_orders(params)
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
    if action == 'attention_clients':
        return _get_attention_clients()
    if action == 'lookup_log':
        return _get_lookup_log(params)
    if action == 'client_by_id':
        return _get_client_by_id(params)

    return _get_clients(params)


def _row_to_client(row):
    return {
        'id': row[0], 'name': row[1], 'phone': row[2], 'channel': row[3],
        'ozon_order_code': row[4], 'created_at': str(row[5]),
        'registered': bool(row[6]), 'total_amount': float(row[7]), 'channels': row[8] or [],
        'comment': row[9] or '',
    }


def _get_clients(params):
    page = max(1, int(params.get('page', 1)))
    limit = min(max(1, int(params.get('limit', 50))), 200)
    q = (params.get('q') or '').strip()
    conn = db()
    try:
        cur = conn.cursor()
        rows, total = repo.get_clients(cur, page=page, limit=limit, q=q)
        return ok({'clients': [_row_to_client(r) for r in rows], 'total': total, 'page': page, 'limit': limit})
    finally:
        conn.close()


def _get_client_by_id(params):
    client_id = params.get('id', '')
    if not client_id or not str(client_id).isdigit():
        return err('Укажите id')
    conn = db()
    try:
        cur = conn.cursor()
        row = repo.get_client_by_id(cur, int(client_id))
        if not row:
            return err('Клиент не найден', 404)
        return ok({'client': _row_to_client(row)})
    finally:
        conn.close()


def _get_registrations_list():
    conn = db()
    try:
        cur = conn.cursor()
        rows = repo.get_registrations_list(cur)
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
        daily_rows = repo.get_registration_stats_daily(cur)
        daily = [{'date': str(r[0]), 'ozon': int(r[1]), 'total': int(r[1])} for r in daily_rows]
        r = repo.get_registration_stats_summary(cur)
        summary = {'ozon': int(r[0] or 0), 'today': int(r[1] or 0), 'this_week': int(r[2] or 0)}
        return ok({'daily': daily, 'summary': summary})
    finally:
        conn.close()


def _get_recent_registrations():
    conn = db()
    try:
        cur = conn.cursor()
        items = [
            {
                'id': r[0], 'name': r[1], 'phone': r[2], 'channel': r[3],
                'registered': bool(r[4]), 'created_at': str(r[5]),
                'total_amount': float(r[6]), 'orders_count': int(r[7]),
            }
            for r in repo.get_recent_registrations(cur)
        ]
        return ok({'registrations': items})
    finally:
        conn.close()


def _get_orders(params):
    page = max(1, int(params.get('page', 1)))
    limit = min(max(1, int(params.get('limit', 50))), 200)
    q = (params.get('q') or '').strip()
    channel = (params.get('channel') or '').strip().lower()

    conn = db()
    try:
        cur = conn.cursor()
        rows, total = repo.get_orders(cur, page=page, limit=limit, q=q, channel=channel)
        orders = [
            {
                'id': r[0], 'order_code': r[1] or '', 'amount': float(r[2]) if r[2] else 0,
                'channel': r[3], 'status': r[4], 'created_at': str(r[5]),
                'registration_id': r[6], 'client_name': r[7] or '',
                'client_phone': r[8] or '', 'magnet_comment': r[9] or '', 'comment': r[10] or '',
            }
            for r in rows
        ]
        return ok({'orders': orders, 'total': total, 'page': page, 'limit': limit})
    finally:
        conn.close()


def _get_attention_clients():
    conn = db()
    try:
        cur = conn.cursor()
        items = [
            {
                'id': r[0], 'name': r[1], 'phone': r[2],
                'ozon_order_code': r[3] or '', 'created_at': str(r[4]),
                'magnet_count': int(r[5]), 'order_count': int(r[6]),
            }
            for r in repo.get_attention_clients(cur)
        ]
        return ok({'clients': items, 'total': len(items)})
    finally:
        conn.close()


def _get_lookup_log(params):
    limit = min(int(params.get('limit', 100)), 500)
    event_filter = params.get('event', '')
    conn = db()
    try:
        cur = conn.cursor()
        items = [
            {
                'id': r[0], 'phone': r[1] or '', 'event': r[2],
                'details': r[3] or '', 'created_at': str(r[4]),
            }
            for r in repo.get_lookup_log(cur, event_filter, limit)
        ]
        counts = {r[0]: int(r[1]) for r in repo.get_lookup_log_counts(cur)}
        return ok({'log': items, 'counts_7d': counts})
    finally:
        conn.close()


def _get_client_orders(params):
    reg_id = params.get('registration_id', '')
    if not reg_id or not reg_id.isdigit():
        return err('registration_id required')
    conn = db()
    try:
        cur = conn.cursor()
        orders = [
            {
                'id': r[0], 'order_code': r[1] or '', 'amount': float(r[2]) if r[2] else 0,
                'channel': r[3], 'status': r[4], 'created_at': str(r[5]),
                'magnet_comment': r[6] or '', 'comment': r[7] or '',
            }
            for r in repo.get_client_orders(cur, int(reg_id))
        ]
        return ok({'orders': orders})
    finally:
        conn.close()