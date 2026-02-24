import json
import re
from utils import OPTIONS_RESPONSE, ok, err, db
import repository as repo
import service


def handler(event, context):
    """Поиск выданных магнитов и бонусов клиента по номеру телефона"""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    if event.get('httpMethod') != 'POST':
        return err('Method not allowed', 405)

    body = json.loads(event.get('body', '{}'))
    raw_phone = (body.get('phone') or '').strip()
    digits = re.sub(r'\D', '', raw_phone)

    if len(digits) < 10:
        return err('Введите корректный номер телефона')

    conn = db()
    try:
        cur = conn.cursor()
        reg = repo.find_registration_by_phone(cur, digits[-10:])

        if not reg:
            repo.log_not_found(cur, raw_phone)
            conn.commit()
            return err('Участник с таким номером не найден. Сначала зарегистрируйтесь в акции.', 404)

        if body.get('check_only'):
            consent_info = service.check_consent(cur, reg[0])
            return ok({'exists': True, **consent_info})

        data = service.build_collection(cur, reg)
        return ok(data)
    finally:
        conn.close()
