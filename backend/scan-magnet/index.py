import json
import re
from utils import OPTIONS_RESPONSE, ok, err, db


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

        cur.execute(
            "SELECT r.id, r.name, r.phone FROM registrations r "
            "WHERE regexp_replace(r.phone, '\\D', '', 'g') LIKE '%%%s%%' LIMIT 1"
            % digits[-10:]
        )
        reg = cur.fetchone()

        if not reg:
            return err('Участник не найден', 404)

        registration_id = reg[0]

        cur.execute(
            "SELECT id, status FROM client_magnets "
            "WHERE registration_id = %d AND breed = '%s' LIMIT 1"
            % (registration_id, breed.replace("'", "''"))
        )
        magnet_row = cur.fetchone()

        if not magnet_row:
            cur.execute(
                "SELECT breed FROM magnet_inventory WHERE breed = '%s' AND active = true LIMIT 1"
                % breed.replace("'", "''")
            )
            breed_exists = cur.fetchone()
            return ok({
                'result': 'not_in_collection',
                'breed': breed,
                'breed_known': breed_exists is not None,
                'client_name': reg[1],
            })

        magnet_id = magnet_row[0]
        current_status = magnet_row[1]

        if current_status == 'in_transit':
            cur.execute(
                "UPDATE client_magnets SET status = 'revealed' WHERE id = %d" % magnet_id
            )
            conn.commit()
            return ok({
                'result': 'revealed',
                'breed': breed,
                'client_name': reg[1],
                'magnet_id': magnet_id,
            })

        return ok({
            'result': 'already_revealed',
            'breed': breed,
            'client_name': reg[1],
            'magnet_id': magnet_id,
        })

    finally:
        conn.close()
