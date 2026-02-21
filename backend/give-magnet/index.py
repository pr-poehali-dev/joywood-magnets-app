import json
from utils import OPTIONS_RESPONSE, ok, err, db


def handler(event, context):
    """POST — выдать магнит / бонус. GET — магниты клиента / остатки / бонусы. DELETE — удалить магнит."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    method = event.get('httpMethod')
    params = event.get('queryStringParameters') or {}

    if method == 'GET' and params.get('action') == 'inventory':
        conn = db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT breed, stars, category, stock FROM magnet_inventory ORDER BY stars, breed")
            inventory = {r[0]: {'stars': r[1], 'category': r[2], 'stock': r[3]} for r in cur.fetchall()}
            return ok({'inventory': inventory})
        finally:
            conn.close()

    if method == 'GET' and params.get('action') == 'bonuses':
        reg_id = params.get('registration_id')
        if not reg_id:
            return err('Укажите registration_id')
        conn = db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, milestone_count, milestone_type, reward, given_at FROM bonuses "
                "WHERE registration_id = %d ORDER BY given_at DESC" % int(reg_id)
            )
            bonuses = [
                {'id': r[0], 'milestone_count': r[1], 'milestone_type': r[2], 'reward': r[3], 'given_at': str(r[4])}
                for r in cur.fetchall()
            ]
            return ok({'bonuses': bonuses})
        finally:
            conn.close()

    if method == 'GET':
        reg_id = params.get('registration_id')
        if not reg_id:
            return err('Укажите registration_id')
        conn = db()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, breed, stars, category, given_at, order_id FROM client_magnets "
                "WHERE registration_id = %d ORDER BY given_at DESC" % int(reg_id)
            )
            magnets = [
                {'id': r[0], 'breed': r[1], 'stars': r[2], 'category': r[3], 'given_at': str(r[4]), 'order_id': r[5]}
                for r in cur.fetchall()
            ]
            return ok({'magnets': magnets})
        finally:
            conn.close()

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        items = body.get('items')
        if not items or not isinstance(items, list):
            return err('Укажите items — массив {breed, stars, category, stock}')
        conn = db()
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
            return ok({'ok': True, 'updated': len(items)})
        finally:
            conn.close()

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')

        if body.get('action') == 'give_bonus':
            registration_id = body.get('registration_id')
            milestone_count = body.get('milestone_count')
            milestone_type = body.get('milestone_type')
            reward = (body.get('reward') or '').strip()
            if not registration_id or not milestone_count or not milestone_type or not reward:
                return err('Укажите registration_id, milestone_count, milestone_type, reward')
            conn = db()
            try:
                cur = conn.cursor()
                cur.execute(
                    "SELECT stock FROM bonus_stock WHERE reward = '%s'" % reward.replace("'", "''")
                )
                stock_row = cur.fetchone()
                if stock_row is not None and stock_row[0] <= 0:
                    return err('Бонус «%s» закончился на складе' % reward)
                cur.execute(
                    "INSERT INTO bonuses (registration_id, milestone_count, milestone_type, reward) "
                    "VALUES (%d, %d, '%s', '%s') "
                    "ON CONFLICT ON CONSTRAINT bonuses_unique DO NOTHING "
                    "RETURNING id, given_at"
                    % (int(registration_id), int(milestone_count), milestone_type.replace("'", "''"), reward.replace("'", "''"))
                )
                row = cur.fetchone()
                if not row:
                    conn.commit()
                    return err('Этот бонус уже был выдан', 409)
                cur.execute(
                    "UPDATE bonus_stock SET stock = GREATEST(stock - 1, 0), updated_at = now() "
                    "WHERE reward = '%s'" % reward.replace("'", "''")
                )
                conn.commit()
                return ok({'id': row[0], 'given_at': str(row[1])})
            finally:
                conn.close()

        registration_id = body.get('registration_id')
        breed = (body.get('breed') or '').strip()
        stars = body.get('stars')
        category = (body.get('category') or '').strip()

        if not registration_id or not breed or not stars or not category:
            return err('Укажите registration_id, breed, stars и category')

        conn = db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, phone FROM registrations WHERE id = %d" % int(registration_id))
            reg = cur.fetchone()
            if not reg:
                return err('Клиент не найден', 404)

            cur.execute(
                "SELECT id FROM client_magnets WHERE registration_id = %d AND breed = '%s' LIMIT 1"
                % (int(registration_id), breed.replace("'", "''"))
            )
            if cur.fetchone():
                return err('Порода «%s» уже есть в коллекции этого клиента' % breed, 409)

            cur.execute("SELECT stock FROM magnet_inventory WHERE breed = '%s'" % breed.replace("'", "''"))
            inv_row = cur.fetchone()
            current_stock = inv_row[0] if inv_row else 0
            if inv_row and current_stock <= 0:
                return err('Магнит «%s» закончился на складе (остаток: 0)' % breed)

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
                    int(registration_id), phone.replace("'", "''"),
                    breed.replace("'", "''"), int(stars),
                    category.replace("'", "''"), order_id_sql,
                )
            )
            row = cur.fetchone()

            if inv_row:
                cur.execute(
                    "UPDATE magnet_inventory SET stock = stock - 1, updated_at = now() "
                    "WHERE breed = '%s' AND stock > 0" % breed.replace("'", "''")
                )
            conn.commit()
            return ok({
                'id': row[0], 'given_at': str(row[1]), 'breed': breed,
                'stars': int(stars), 'stock_after': max(current_stock - 1, 0) if inv_row else None,
            })
        finally:
            conn.close()

    if method == 'DELETE':
        magnet_id = params.get('magnet_id')
        if not magnet_id or not str(magnet_id).isdigit():
            return err('Укажите magnet_id')
        conn = db()
        try:
            cur = conn.cursor()
            cur.execute("SELECT id, breed FROM client_magnets WHERE id = %d" % int(magnet_id))
            row = cur.fetchone()
            if not row:
                return err('Магнит не найден', 404)
            cur.execute("UPDATE magnet_inventory SET stock = stock + 1, updated_at = now() WHERE breed = '%s'" % row[1].replace("'", "''"))
            cur.execute("DELETE FROM client_magnets WHERE id = %d" % int(magnet_id))
            conn.commit()
            return ok({'ok': True, 'breed': row[1]})
        finally:
            conn.close()

    return err('Method not allowed', 405)