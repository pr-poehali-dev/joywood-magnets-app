import re
from utils import OPTIONS_RESPONSE, ok, err, db


def handler(event, context):
    """Регистрация участника акции. Если код Ozon совпадает с уже добавленным менеджером — объединяет записи."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    if event.get('httpMethod') != 'POST':
        return err('Method not allowed', 405)

    import json
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

        merged = False
        existing_id = None

        if ozon_order_code:
            # Извлекаем числовой префикс из кода заказа (до первого дефиса)
            ozon_prefix = re.split(r'[-\s]', ozon_order_code.strip())[0]

            if ozon_prefix and ozon_prefix.isdigit():
                # Ищем запись где ozon_order_code содержит этот префикс и клиент ещё не зарегистрирован
                cur.execute(
                    "SELECT id, ozon_order_code FROM registrations "
                    "WHERE ozon_order_code IS NOT NULL "
                    "AND ozon_order_code LIKE '%s%%' "
                    "AND registered = FALSE "
                    "ORDER BY id LIMIT 1"
                    % ozon_prefix.replace("'", "''")
                )
                row = cur.fetchone()
                if row:
                    existing_id = row[0]
                    # Имя храним как "ПРЕФИКС Имя" чтобы помнить источник
                    display_name = ('%s %s' % (ozon_prefix, name)).replace("'", "''")
                    cur.execute(
                        "UPDATE registrations SET name='%s', phone='%s', channel='Ozon', "
                        "registered=TRUE "
                        "WHERE id=%d"
                        % (
                            display_name,
                            phone.replace("'", "''"),
                            existing_id,
                        )
                    )
                    conn.commit()
                    merged = True

        if not merged:
            # Проверяем, существует ли уже клиент с таким телефоном
            cur.execute(
                "SELECT id FROM registrations WHERE phone='%s' LIMIT 1"
                % phone.replace("'", "''")
            )
            existing = cur.fetchone()

            if existing:
                existing_id = existing[0]
                cur.execute(
                    "UPDATE registrations SET name='%s', registered=TRUE %s WHERE id=%d"
                    % (
                        name.replace("'", "''"),
                        (", ozon_order_code='%s'" % ozon_order_code.replace("'", "''")) if ozon_order_code else '',
                        existing_id,
                    )
                )
                conn.commit()
            else:
                channel = 'Ozon' if ozon_order_code else ''
                cur.execute(
                    "INSERT INTO registrations (name, phone, channel, ozon_order_code, registered) "
                    "VALUES ('%s', '%s', '%s', %s, TRUE) RETURNING id, created_at"
                    % (
                        name.replace("'", "''"),
                        phone.replace("'", "''"),
                        channel,
                        "'" + ozon_order_code.replace("'", "''") + "'" if ozon_order_code else 'NULL',
                    )
                )
                row = cur.fetchone()
                conn.commit()
                existing_id = row[0]

        return ok({'id': existing_id, 'merged': merged, 'message': 'Регистрация успешна'})
    finally:
        conn.close()