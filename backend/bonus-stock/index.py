import json
import os
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}
CORS = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
OPTIONS_RESPONSE = {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}


def ok(data):
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def err(message, status=400):
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps({'error': message}, ensure_ascii=False)}


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event, context):
    """GET — остатки призов по бонусам. PUT — обновить остаток."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    method = event.get('httpMethod')
    conn = db()
    try:
        cur = conn.cursor()

        if method == 'GET':
            cur.execute("SELECT reward, stock FROM bonus_stock ORDER BY reward")
            rows = cur.fetchall()
            return ok({'stock': {r[0]: r[1] for r in rows}})

        if method == 'PUT':
            body = json.loads(event.get('body') or '{}')
            reward = (body.get('reward') or '').strip()
            stock = body.get('stock')
            if not reward:
                return err('Укажите reward')
            if stock is None or int(stock) < 0:
                return err('Укажите корректный остаток')
            cur.execute(
                "INSERT INTO bonus_stock (reward, stock, updated_at) VALUES ('%s', %d, now()) "
                "ON CONFLICT (reward) DO UPDATE SET stock = %d, updated_at = now()"
                % (reward.replace("'", "''"), int(stock), int(stock))
            )
            conn.commit()
            return ok({'ok': True, 'reward': reward, 'stock': int(stock)})

        return err('Метод не поддерживается', 405)
    finally:
        conn.close()
