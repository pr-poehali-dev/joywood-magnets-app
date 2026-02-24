import json
from utils import OPTIONS_RESPONSE, ok, err, db
import service


def handler(event, context):
    """Регистрация участника акции. Если код Ozon совпадает с уже добавленным менеджером — объединяет записи."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    if event.get('httpMethod') != 'POST':
        return err('Method not allowed', 405)

    body = json.loads(event.get('body', '{}'))
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    ozon_order_code = (body.get('ozon_order_code') or '').strip() or None

    if len(name) < 2:
        return err('Укажите имя (минимум 2 символа)')
    if len(phone) < 6:
        return err('Укажите корректный телефон')

    conn = db()
    try:
        cur = conn.cursor()
        result = service.register(cur, conn, name, phone, ozon_order_code)
        return ok(result)
    except service.OzonCodeNotFound as e:
        return err(str(e), 404)
    finally:
        conn.close()
