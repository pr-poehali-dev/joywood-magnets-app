import json
import re
from utils import OPTIONS_RESPONSE, ok, err, db
import repository as repo


def handler(event: dict, context) -> dict:
    """Сохранение согласия клиента с политикой конфиденциальности"""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    body = json.loads(event.get('body') or '{}')
    phone = (body.get('phone') or '').strip()
    policy_version = (body.get('policy_version') or '').strip()
    user_agent = (body.get('user_agent') or '').strip()[:500]

    digits = re.sub(r'\D', '', phone)
    if len(digits) < 10:
        return err('Некорректный телефон')

    ip = (event.get('requestContext') or {}).get('identity', {}).get('sourceIp') or ''

    conn = db()
    try:
        cur = conn.cursor()
        reg_id = repo.find_registration_by_phone(cur, digits[-10:])
        repo.insert_consent(cur, reg_id, phone, policy_version, ip, user_agent)
        conn.commit()
        return ok({'ok': True})
    finally:
        conn.close()
