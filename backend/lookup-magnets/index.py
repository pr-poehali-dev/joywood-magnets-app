import json
import re
from utils import OPTIONS_RESPONSE, ok, err, db


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
        cur.execute(
            "SELECT r.id, r.name, r.phone FROM registrations r "
            "WHERE regexp_replace(r.phone, '\\D', '', 'g') LIKE '%%%s%%' LIMIT 1"
            % digits[-10:]
        )
        reg = cur.fetchone()

        if not reg:
            return err('Участник с таким номером не найден. Сначала зарегистрируйтесь в акции.', 404)

        if body.get('check_only'):
            return ok({'exists': True})

        cur.execute(
            "SELECT id, breed, stars, category, given_at FROM client_magnets "
            "WHERE registration_id = %d ORDER BY given_at DESC" % reg[0]
        )
        magnets = [
            {'id': r[0], 'breed': r[1], 'stars': r[2], 'category': r[3], 'given_at': str(r[4])}
            for r in cur.fetchall()
        ]

        cur.execute(
            "SELECT id, milestone_count, milestone_type, reward, given_at FROM bonuses "
            "WHERE registration_id = %d ORDER BY given_at DESC" % reg[0]
        )
        bonuses = [
            {'id': r[0], 'milestone_count': r[1], 'milestone_type': r[2], 'reward': r[3], 'given_at': str(r[4])}
            for r in cur.fetchall()
        ]

        return ok({
            'client_name': reg[1], 'phone': reg[2],
            'magnets': magnets, 'total_magnets': len(magnets),
            'unique_breeds': len(set(m['breed'] for m in magnets)),
            'bonuses': bonuses,
        })
    finally:
        conn.close()