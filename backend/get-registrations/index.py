import json
import os
import psycopg2


def handler(event, context):
    """Получение списка зарегистрированных участников акции"""
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

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, phone, channel, ozon_order_code, created_at, registered "
            "FROM registrations ORDER BY created_at DESC"
        )
        rows = cur.fetchall()
        clients = []
        for row in rows:
            clients.append({
                'id': row[0],
                'name': row[1],
                'phone': row[2],
                'channel': row[3],
                'ozon_order_code': row[4],
                'created_at': str(row[5]),
                'registered': bool(row[6]),
            })
        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({'clients': clients}, ensure_ascii=False),
        }
    finally:
        conn.close()