import json
import re
from utils import OPTIONS_RESPONSE, ok, err, db
import repository as repo
import service


def handler(event, context):
    """POST — сканирование QR-кода магнита породы. Раскрывает магнит, если он 'в пути' у этого пользователя."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    if event.get('httpMethod') != 'POST':
        return err('Method not allowed', 405)

    body = json.loads(event.get('body', '{}'))
    raw_phone = (body.get('phone') or '').strip()
    breed = (body.get('breed') or '').strip()

    if not raw_phone or not breed:
        return err('Укажите phone и breed')

    digits = re.sub(r'\D', '', raw_phone)
    if len(digits) < 10:
        return err('Некорректный номер телефона')

    conn = db()
    try:
        cur = conn.cursor()
        reg = repo.find_registration_by_phone(cur, digits[-10:])
        if not reg:
            return err('Участник не найден', 404)

        result = service.scan(cur, conn, reg, breed)
        return ok(result)
    finally:
        conn.close()
