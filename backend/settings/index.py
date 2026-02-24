import json
from utils import OPTIONS_RESPONSE, ok, err, db
import repository as repo


def handler(event: dict, context) -> dict:
    """Чтение и обновление настроек приложения (например, верификация телефона)"""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    method = event.get('httpMethod', 'GET')

    if method == 'GET':
        conn = db()
        try:
            cur = conn.cursor()
            return ok(repo.get_all(cur))
        finally:
            conn.close()

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        key = body.get('key')
        value = body.get('value')
        if not key or value is None:
            return err('key и value обязательны')
        conn = db()
        try:
            cur = conn.cursor()
            repo.upsert(cur, key, value)
            conn.commit()
            return ok({'ok': True, 'key': key, 'value': str(value)})
        finally:
            conn.close()

    return err('Method not allowed', 405)
