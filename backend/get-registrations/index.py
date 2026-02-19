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
            "SELECT r.id, r.name, r.phone, r.channel, r.ozon_order_code, r.created_at, r.registered, "
            "COALESCE(SUM(o.amount), 0) as total_amount "
            "FROM registrations r "
            "LEFT JOIN orders o ON o.registration_id = r.id "
            "GROUP BY r.id ORDER BY r.created_at DESC"
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
                'total_amount': float(row[7]),
            })
        return {
            'statusCode': 200,
            'headers': cors,
            'body': json.dumps({'clients': clients}, ensure_ascii=False),
        }
    finally:
        conn.close()