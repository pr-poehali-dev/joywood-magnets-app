import json
import os
import psycopg2


def handler(event, context):
    """Регистрация участника акции. Если код Ozon совпадает с уже добавленным менеджером — объединяет записи."""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    cors = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': cors, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body', '{}'))
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    ozon_order_code = (body.get('ozon_order_code') or '').strip() or None

    if len(name) < 2:
        return {
            'statusCode': 400, 'headers': cors,
            'body': json.dumps({'error': 'Укажите имя (минимум 2 символа)'}, ensure_ascii=False),
        }
    if len(phone) < 6:
        return {
            'statusCode': 400, 'headers': cors,
            'body': json.dumps({'error': 'Укажите корректный телефон'}, ensure_ascii=False),
        }

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()

        merged = False
        existing_id = None

        if ozon_order_code:
            ozon_prefix = ozon_order_code.split('-')[0].strip()
            if ozon_prefix:
                cur.execute(
                    "SELECT id FROM registrations "
                    "WHERE ozon_order_code IS NOT NULL "
                    "AND split_part(ozon_order_code, '-', 1) = '%s' "
                    "AND registered = FALSE "
                    "ORDER BY id LIMIT 1"
                    % ozon_prefix.replace("'", "''")
                )
                row = cur.fetchone()
                if row:
                    existing_id = row[0]
                    display_name = ('%s %s' % (ozon_prefix, name)).replace("'", "''")
                    cur.execute(
                        "UPDATE registrations SET name='%s', phone='%s', channel='Ozon', "
                        "ozon_order_code='%s', registered=TRUE "
                        "WHERE id=%d"
                        % (
                            display_name,
                            phone.replace("'", "''"),
                            ozon_order_code.replace("'", "''"),
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

        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({
                'id': existing_id,
                'merged': merged,
                'message': 'Регистрация успешна',
            }, ensure_ascii=False),
        }
    finally:
        conn.close()