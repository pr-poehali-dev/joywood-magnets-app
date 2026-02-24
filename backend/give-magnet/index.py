import json
from utils import OPTIONS_RESPONSE, ok, err, db
import repository as repo
import service


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
            return ok({'inventory': repo.get_inventory(cur)})
        finally:
            conn.close()

    if method == 'GET' and params.get('action') == 'bonuses':
        reg_id = params.get('registration_id')
        if not reg_id:
            return err('Укажите registration_id')
        conn = db()
        try:
            cur = conn.cursor()
            return ok({'bonuses': repo.get_bonuses_for_client(cur, int(reg_id))})
        finally:
            conn.close()

    if method == 'GET':
        reg_id = params.get('registration_id')
        if not reg_id:
            return err('Укажите registration_id')
        conn = db()
        try:
            cur = conn.cursor()
            return ok({'magnets': repo.get_magnets_for_client(cur, int(reg_id))})
        finally:
            conn.close()

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        if body.get('action') == 'toggle_active':
            breed = (body.get('breed') or '').strip()
            active = body.get('active')
            if not breed or active is None:
                return err('Укажите breed и active')
            conn = db()
            try:
                cur = conn.cursor()
                repo.toggle_breed_active(cur, breed, active)
                conn.commit()
                return ok({'ok': True, 'breed': breed, 'active': active})
            finally:
                conn.close()

        items = body.get('items')
        if not items or not isinstance(items, list):
            return err('Укажите items — массив {breed, stars, category, stock}')
        conn = db()
        try:
            cur = conn.cursor()
            for item in items:
                breed = (item.get('breed') or '').strip()
                if not breed:
                    continue
                repo.update_inventory_item(cur, breed, item.get('stars', 1), item.get('category', ''), item.get('stock', 0))
            conn.commit()
            return ok({'ok': True, 'updated': len(items)})
        finally:
            conn.close()

    if method == 'DELETE':
        magnet_id = params.get('magnet_id')
        if not magnet_id or not str(magnet_id).isdigit():
            return err('Укажите magnet_id')
        conn = db()
        try:
            cur = conn.cursor()
            result = service.remove_magnet(cur, conn, int(magnet_id))
            return ok(result)
        except service.MagnetError as e:
            return err(str(e), e.status)
        finally:
            conn.close()

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')

        if body.get('action') == 'give_bonus':
            registration_id = body.get('registration_id')
            milestone_count = body.get('milestone_count')
            milestone_type = body.get('milestone_type')
            reward = (body.get('reward') or '').strip()
            order_id = body.get('order_id')
            if not registration_id or not milestone_count or not milestone_type or not reward:
                return err('Укажите registration_id, milestone_count, milestone_type, reward')
            conn = db()
            try:
                cur = conn.cursor()
                result = service.give_bonus(cur, conn, registration_id, milestone_count, milestone_type, reward, order_id)
                return ok(result)
            except service.MagnetError as e:
                return err(str(e), e.status)
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
            result = service.give_magnet(cur, conn, registration_id, breed, stars, category)
            return ok(result)
        except service.MagnetError as e:
            return err(str(e), e.status)
        finally:
            conn.close()

    return err('Method not allowed', 405)
