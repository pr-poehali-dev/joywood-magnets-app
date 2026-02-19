import json
import os
import psycopg2


def handler(event, context):
    """Регистрация нового участника акции Атлас пород"""
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

    cors = {'Access-Control-Allow-Origin': '*'}

    if event.get('httpMethod') != 'POST':
        return {
            'statusCode': 405,
            'headers': cors,
            'body': json.dumps({'error': 'Method not allowed'}),
        }

    body = json.loads(event.get('body', '{}'))
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    channel = (body.get('channel') or '').strip()
    ozon_order_code = (body.get('ozon_order_code') or '').strip() or None

    if len(name) < 2:
        return {
            'statusCode': 400,
            'headers': cors,
            'body': json.dumps({'error': 'Укажите имя (минимум 2 символа)'}, ensure_ascii=False),
        }

    if len(phone) < 6:
        return {
            'statusCode': 400,
            'headers': cors,
            'body': json.dumps({'error': 'Укажите корректный телефон'}, ensure_ascii=False),
        }

    if not channel:
        return {
            'statusCode': 400,
            'headers': cors,
            'body': json.dumps({'error': 'Выберите канал'}, ensure_ascii=False),
        }

    if channel == 'Ozon' and not ozon_order_code:
        return {
            'statusCode': 400,
            'headers': cors,
            'body': json.dumps({'error': 'Укажите код заказа Ozon'}, ensure_ascii=False),
        }

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO registrations (name, phone, channel, ozon_order_code) "
            "VALUES ('%s', '%s', '%s', %s) RETURNING id, created_at"
            % (
                name.replace("'", "''"),
                phone.replace("'", "''"),
                channel.replace("'", "''"),
                "'" + ozon_order_code.replace("'", "''") + "'" if ozon_order_code else 'NULL',
            )
        )
        row = cur.fetchone()
        conn.commit()
        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({
                'id': row[0],
                'created_at': str(row[1]),
                'message': 'Регистрация успешна',
            }, ensure_ascii=False),
        }
    finally:
        conn.close()