import json
from utils import OPTIONS_RESPONSE, ok, err, db
import repository as repo


def handler(event, context):
    """GET — остатки призов по бонусам. PUT — обновить остаток."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    method = event.get('httpMethod')
    conn = db()
    try:
        cur = conn.cursor()

        if method == 'GET':
            return ok({'stock': repo.get_stock(cur)})

        if method == 'PUT':
            body = json.loads(event.get('body') or '{}')
            reward = (body.get('reward') or '').strip()
            stock = body.get('stock')
            if not reward:
                return err('Укажите reward')
            if stock is None or int(stock) < 0:
                return err('Укажите корректный остаток')
            repo.upsert_stock(cur, reward, int(stock))
            conn.commit()
            return ok({'ok': True, 'reward': reward, 'stock': int(stock)})

        return err('Метод не поддерживается', 405)
    finally:
        conn.close()
