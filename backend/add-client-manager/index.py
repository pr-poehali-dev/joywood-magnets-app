import json
from utils import OPTIONS_RESPONSE, ok, err, db


def handler(event, context):
    """Управление клиентами и заказами: добавление, редактирование, удаление, оформление заказов"""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    if event.get('httpMethod') == 'DELETE':
        params = event.get('queryStringParameters') or {}
        if params.get('order_id'):
            return _handle_delete_order(params)
        return _handle_delete(event)

    if event.get('httpMethod') == 'PUT':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action', '')
        if action == 'update_order':
            return _handle_update_order(body)
        return _handle_update_client(body)

    if event.get('httpMethod') != 'POST':
        return err('Method not allowed', 405)

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    if action == 'create_order':
        return _handle_create_order(body)
    if action == 'save_magnet_comment':
        return _handle_save_magnet_comment(body)
    if action == 'update_client_comment':
        return _handle_update_client_comment(body)

    return _handle_add_client(body)


def _handle_delete_order(params):
    order_id = params.get('order_id')
    if not order_id or not str(order_id).isdigit():
        return err('Укажите order_id')
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM orders WHERE id = %d" % int(order_id))
        if not cur.fetchone():
            return err('Заказ не найден', 404)
        cur.execute("SELECT id, breed FROM client_magnets WHERE order_id = %d" % int(order_id))
        magnet = cur.fetchone()
        if magnet:
            cur.execute("UPDATE magnet_inventory SET stock = stock + 1, updated_at = now() WHERE breed = '%s'" % magnet[1].replace("'", "''"))
            cur.execute("DELETE FROM client_magnets WHERE id = %d" % magnet[0])
        cur.execute("DELETE FROM orders WHERE id = %d" % int(order_id))
        conn.commit()
        return ok({'ok': True, 'magnet_removed': magnet is not None, 'magnet_breed': magnet[1] if magnet else None})
    finally:
        conn.close()


def _handle_delete(event):
    params = event.get('queryStringParameters') or {}
    client_id = params.get('id')
    if not client_id or not client_id.isdigit():
        return err('Укажите id клиента')
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM registrations WHERE id = %s" % int(client_id))
        if not cur.fetchone():
            return err('Клиент не найден', 404)
        cur.execute("DELETE FROM client_magnets WHERE registration_id = %s" % int(client_id))
        cur.execute("DELETE FROM orders WHERE registration_id = %s" % int(client_id))
        cur.execute("DELETE FROM registrations WHERE id = %s" % int(client_id))
        conn.commit()
        return ok({'ok': True})
    finally:
        conn.close()


def _handle_update_client(body):
    client_id = body.get('id')
    if not client_id:
        return err('Укажите id клиента')
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    if not name and not phone:
        return err('Укажите имя или телефон')

    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM registrations WHERE id = %s" % int(client_id))
        if not cur.fetchone():
            return err('Клиент не найден', 404)

        updates = []
        if name:
            updates.append("name = '%s'" % name.replace("'", "''"))
        if phone:
            updates.append("phone = '%s'" % phone.replace("'", "''"))

        has_real_data = (name and len(name) >= 2) or (
            phone and len(phone.replace(' ', '').replace('(', '').replace(')', '').replace('-', '').replace('+', '')) >= 11
        )
        if has_real_data:
            updates.append("registered = TRUE")

        cur.execute("UPDATE registrations SET %s WHERE id = %s" % (', '.join(updates), int(client_id)))
        conn.commit()

        cur.execute("SELECT id, name, phone, channel, ozon_order_code, registered FROM registrations WHERE id = %s" % int(client_id))
        row = cur.fetchone()
        return ok({'ok': True, 'client': {
            'id': row[0], 'name': row[1], 'phone': row[2],
            'channel': row[3], 'ozon_order_code': row[4], 'registered': row[5],
        }})
    finally:
        conn.close()


def _get_pending_bonuses(cur, registration_id, total_magnets, unique_breeds):
    milestones = [
        {'count': 5, 'type': 'magnets', 'reward': 'Кисть для клея Titebrush TM Titebond'},
        {'count': 10, 'type': 'breeds', 'reward': 'Клей Titebond III 473 мл'},
        {'count': 30, 'type': 'breeds', 'reward': 'Клей Titebond III 946 мл'},
        {'count': 50, 'type': 'breeds', 'reward': 'Клей Titebond III 3,785 л'},
    ]
    cur.execute("SELECT milestone_count, milestone_type FROM bonuses WHERE registration_id = %d" % registration_id)
    given = set((r[0], r[1]) for r in cur.fetchall())
    return [
        m for m in milestones
        if (total_magnets if m['type'] == 'magnets' else unique_breeds) >= m['count']
        and (m['count'], m['type']) not in given
    ]


def _give_paduk(cur, registration_id, phone, order_id):
    cur.execute(
        "INSERT INTO client_magnets (registration_id, phone, breed, stars, category, order_id) "
        "VALUES (%d, '%s', 'Падук', 2, 'Особенный', %d)"
        % (registration_id, (phone or '').replace("'", "''"), order_id)
    )
    cur.execute(
        "UPDATE magnet_inventory SET stock = GREATEST(stock - 1, 0), updated_at = now() "
        "WHERE breed = 'Падук' AND stock > 0"
    )


def _handle_create_order(body):
    order_number = (body.get('order_number') or '').strip()
    channel = (body.get('channel') or '').strip() or 'Ozon'
    amount = body.get('amount', 0)
    client_id = body.get('client_id')

    try:
        amount = float(amount) if amount else 0
    except (ValueError, TypeError):
        amount = 0

    if client_id:
        return _create_order_for_client(int(client_id), order_number, channel, amount)

    if not order_number or len(order_number) < 3:
        return err('Укажите номер заказа (минимум 3 символа)')

    prefix = order_number.split('-')[0].strip()
    conn = db()
    try:
        cur = conn.cursor()

        cur.execute("SELECT id FROM orders WHERE order_code = '%s' LIMIT 1" % order_number.replace("'", "''"))
        if cur.fetchone():
            return err('Заказ с таким номером уже существует', 409)

        cur.execute(
            "SELECT id, name, phone, ozon_order_code, registered FROM registrations "
            "WHERE ozon_order_code IS NOT NULL "
            "AND split_part(ozon_order_code, '-', 1) = '%s' ORDER BY id LIMIT 1"
            % prefix.replace("'", "''")
        )
        row = cur.fetchone()

        if row:
            cid = row[0]
            existing_code = row[3] or ''
            registered = bool(row[4])

            cur.execute(
                "SELECT id FROM orders WHERE registration_id = %d AND order_code = '%s' LIMIT 1"
                % (cid, order_number.replace("'", "''"))
            )
            if cur.fetchone():
                return err('Заказ с таким номером уже существует', 409)

            if order_number not in existing_code:
                codes = existing_code + ', ' + order_number if existing_code else order_number
                cur.execute("UPDATE registrations SET ozon_order_code = '%s' WHERE id = %d" % (codes.replace("'", "''"), cid))

            cur.execute(
                "INSERT INTO orders (registration_id, order_code, amount, channel) "
                "VALUES (%d, '%s', %s, '%s') RETURNING id, created_at, status"
                % (cid, order_number.replace("'", "''"), amount, channel.replace("'", "''"))
            )
            ord_row = cur.fetchone()
            conn.commit()

            pending_bonuses = []
            if registered:
                cur.execute("SELECT COUNT(*) FROM client_magnets WHERE registration_id = %d" % cid)
                total_magnets = cur.fetchone()[0]
                cur.execute("SELECT COUNT(DISTINCT breed) FROM client_magnets WHERE registration_id = %d" % cid)
                unique_breeds = cur.fetchone()[0]
                pending_bonuses = _get_pending_bonuses(cur, cid, total_magnets, unique_breeds)

            return ok({
                'client_id': cid, 'client_name': row[1], 'client_phone': row[2] or '',
                'order_id': ord_row[0], 'order_code': order_number, 'amount': amount,
                'channel': channel, 'created_at': str(ord_row[1]), 'status': ord_row[2] or 'active',
                'is_new': False, 'registered': registered, 'pending_bonuses': pending_bonuses,
                'message': 'Заказ добавлен к существующему клиенту',
            })
        else:
            client_name = 'Клиент ' + prefix
            cur.execute(
                "INSERT INTO registrations (name, phone, channel, ozon_order_code, registered) "
                "VALUES ('%s', '', '%s', '%s', FALSE) RETURNING id"
                % (client_name.replace("'", "''"), channel.replace("'", "''"), order_number.replace("'", "''"))
            )
            new_id = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO orders (registration_id, order_code, amount, channel) "
                "VALUES (%d, '%s', %s, '%s') RETURNING id, created_at, status"
                % (new_id, order_number.replace("'", "''"), amount, channel.replace("'", "''"))
            )
            ord_row = cur.fetchone()
            order_id = ord_row[0]
            _give_paduk(cur, new_id, '', order_id)
            conn.commit()
            return ok({
                'client_id': new_id, 'client_name': client_name, 'client_phone': '',
                'order_id': order_id, 'order_code': order_number, 'amount': amount,
                'channel': channel, 'created_at': str(ord_row[1]), 'status': ord_row[2] or 'active',
                'is_new': True, 'registered': False, 'pending_bonuses': [], 'magnet_given': 'Падук',
                'message': 'Создан новый клиент',
            })
    finally:
        conn.close()


def _create_order_for_client(client_id, order_code, channel, amount):
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, phone, registered FROM registrations WHERE id = %d" % client_id)
        row = cur.fetchone()
        if not row:
            return err('Клиент не найден', 404)

        registered = bool(row[3])
        cur.execute("SELECT COUNT(*) FROM orders WHERE registration_id = %d" % client_id)
        existing_orders = cur.fetchone()[0]

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
        order_id = ord_row[0]

        if existing_orders == 0:
            _give_paduk(cur, client_id, row[2] or '', order_id)

        conn.commit()

        pending_bonuses = []
        if registered:
            cur.execute("SELECT COUNT(*) FROM client_magnets WHERE registration_id = %d" % client_id)
            total_magnets = cur.fetchone()[0]
            cur.execute("SELECT COUNT(DISTINCT breed) FROM client_magnets WHERE registration_id = %d" % client_id)
            unique_breeds = cur.fetchone()[0]
            pending_bonuses = _get_pending_bonuses(cur, client_id, total_magnets, unique_breeds)

        return ok({
            'client_id': client_id, 'client_name': row[1], 'client_phone': row[2] or '',
            'order_id': order_id, 'order_code': order_code or '', 'amount': amount,
            'channel': channel, 'created_at': str(ord_row[1]), 'status': ord_row[2] or 'active',
            'is_new': False, 'registered': registered,
            'is_first_order': existing_orders == 0,
            'magnet_given': 'Падук' if existing_orders == 0 else None,
            'pending_bonuses': pending_bonuses, 'message': 'Заказ оформлен',
        })
    finally:
        conn.close()


def _handle_update_order(body):
    order_id = body.get('order_id')
    if not order_id or not str(order_id).isdigit():
        return err('Укажите order_id')
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM orders WHERE id = %d" % int(order_id))
        if not cur.fetchone():
            return err('Заказ не найден', 404)
        updates = []
        if 'amount' in body:
            try:
                amount = float(body['amount'])
                updates.append("amount = %s" % amount)
            except (ValueError, TypeError):
                return err('Некорректная сумма')
        if 'order_code' in body:
            code = (body['order_code'] or '').strip()
            updates.append("order_code = '%s'" % code.replace("'", "''"))
        if 'comment' in body:
            comment = (body['comment'] or '').strip()
            updates.append("comment = '%s'" % comment.replace("'", "''"))
        if not updates:
            return err('Нет данных для обновления')
        cur.execute("UPDATE orders SET %s WHERE id = %d" % (', '.join(updates), int(order_id)))
        conn.commit()
        cur.execute("SELECT id, order_code, amount, channel, status, created_at, comment, magnet_comment FROM orders WHERE id = %d" % int(order_id))
        row = cur.fetchone()
        return ok({'ok': True, 'order': {
            'id': row[0], 'order_code': row[1], 'amount': float(row[2] or 0),
            'channel': row[3], 'status': row[4], 'created_at': str(row[5]),
            'comment': row[6], 'magnet_comment': row[7],
        }})
    finally:
        conn.close()


def _handle_update_client_comment(body):
    client_id = body.get('client_id')
    comment = (body.get('comment') or '').strip()
    if not client_id or not str(client_id).isdigit():
        return err('Укажите client_id')
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE registrations SET comment = '%s' WHERE id = %d" % (comment.replace("'", "''"), int(client_id)))
        conn.commit()
        return ok({'ok': True})
    finally:
        conn.close()


def _handle_save_magnet_comment(body):
    order_id = body.get('order_id')
    comment = (body.get('comment') or '').strip()
    if not order_id or not str(order_id).isdigit():
        return err('Укажите order_id')
    if not comment:
        return err('Укажите comment')
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE orders SET magnet_comment = '%s' WHERE id = %d" % (comment.replace("'", "''"), int(order_id)))
        conn.commit()
        return ok({'ok': True})
    finally:
        conn.close()


def _handle_add_client(body):
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    channel = (body.get('channel') or '').strip()
    ozon_order_code = (body.get('ozon_order_code') or '').strip() or None

    has_full_data = len(name) >= 2 and len(phone) >= 6 and channel
    has_ozon_code = ozon_order_code and len(ozon_order_code) >= 3

    if not has_full_data and not has_ozon_code:
        return err('Укажите код заказа Ozon или полные данные клиента')

    registered = has_full_data
    if not channel and has_ozon_code:
        channel = 'Ozon'

    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO registrations (name, phone, channel, ozon_order_code, registered) "
            "VALUES ('%s', '%s', '%s', %s, %s) RETURNING id, created_at"
            % (
                name.replace("'", "''"), phone.replace("'", "''"), channel.replace("'", "''"),
                "'" + ozon_order_code.replace("'", "''") + "'" if ozon_order_code else 'NULL',
                'TRUE' if registered else 'FALSE',
            )
        )
        row = cur.fetchone()
        conn.commit()
        return ok({'id': row[0], 'created_at': str(row[1]), 'registered': registered})
    finally:
        conn.close()