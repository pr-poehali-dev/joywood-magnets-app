import json
from utils import OPTIONS_RESPONSE, ok, err, db
import repository as repo
import service


def handler(event, context):
    """Управление клиентами и заказами: добавление, редактирование, удаление, оформление заказов"""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    if event.get('httpMethod') == 'DELETE':
        params = event.get('queryStringParameters') or {}
        if params.get('order_id'):
            return _handle_delete_order(params)
        return _handle_delete_client(event)

    if event.get('httpMethod') == 'PUT':
        body = json.loads(event.get('body') or '{}')
        if body.get('action') == 'update_order':
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
    return_magnets = params.get('return_magnets') == '1'
    return_bonuses = params.get('return_bonuses') == '1'
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM t_p65563100_joywood_magnets_app.orders WHERE id = %d" % int(order_id))
        if not cur.fetchone():
            return err('Заказ не найден', 404)
        result = service.delete_order(cur, conn, int(order_id), return_magnets, return_bonuses)
        return ok(result)
    finally:
        conn.close()


def _handle_delete_client(event):
    params = event.get('queryStringParameters') or {}
    client_id = params.get('id')
    if not client_id or not client_id.isdigit():
        return err('Укажите id клиента')
    return_magnets = params.get('return_magnets') == '1'
    conn = db()
    try:
        cur = conn.cursor()
        if not repo.find_registration(cur, int(client_id)):
            return err('Клиент не найден', 404)
        repo.delete_client_cascade(cur, int(client_id), return_magnets=return_magnets)
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
        if not repo.find_registration(cur, int(client_id)):
            return err('Клиент не найден', 404)
        result = service.update_client(cur, conn, int(client_id), name, phone)
        return ok(result)
    finally:
        conn.close()


def _handle_create_order(body):
    order_number = (body.get('order_number') or '').strip()
    channel = (body.get('channel') or '').strip() or 'Ozon'
    amount = body.get('amount', 0)
    client_id = body.get('client_id')

    try:
        amount = float(amount) if amount else 0
    except (ValueError, TypeError):
        amount = 0

    conn = db()
    try:
        cur = conn.cursor()
        if client_id:
            result = service.create_order_for_client(cur, conn, int(client_id), order_number, channel, amount)
        else:
            if not order_number or len(order_number) < 3:
                return err('Укажите номер заказа (минимум 3 символа)')
            result = service.create_order_by_ozon_code(cur, conn, order_number, channel, amount)
        return ok(result)
    except service.ClientError as e:
        return err(str(e), e.status)
    finally:
        conn.close()


def _handle_update_order(body):
    order_id = body.get('order_id')
    if not order_id or not str(order_id).isdigit():
        return err('Укажите order_id')
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM t_p65563100_joywood_magnets_app.orders WHERE id = %d" % int(order_id))
        if not cur.fetchone():
            return err('Заказ не найден', 404)
        updates = []
        if 'amount' in body:
            try:
                updates.append("amount = %s" % float(body['amount']))
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
        cur.execute(
            "UPDATE t_p65563100_joywood_magnets_app.orders SET %s WHERE id = %d" % (', '.join(updates), int(order_id))
        )
        conn.commit()
        row = repo.get_order_full(cur, int(order_id))
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
        cur.execute(
            "UPDATE t_p65563100_joywood_magnets_app.registrations SET comment = '%s' WHERE id = %d"
            % (comment.replace("'", "''"), int(client_id))
        )
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
        cur.execute(
            "UPDATE t_p65563100_joywood_magnets_app.orders SET magnet_comment = '%s' WHERE id = %d"
            % (comment.replace("'", "''"), int(order_id))
        )
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
        row = repo.insert_registration(cur, name, phone, channel, ozon_order_code, registered)
        conn.commit()
        return ok({'id': row[0], 'created_at': str(row[1]), 'registered': registered})
    finally:
        conn.close()