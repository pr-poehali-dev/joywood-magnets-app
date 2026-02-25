# Единый источник правды для всех backend-функций.
# НЕ редактировать копии в папках функций — только этот файл.
# После изменений запустить: npm run sync:utils
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


def ok(data: dict) -> dict:
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def err(message: str, status: int = 400) -> dict:
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps({'error': message}, ensure_ascii=False)}


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


SCHEMA = 't_p65563100_joywood_magnets_app'


def resolve_actor(event: dict) -> str | None:
    """Возвращает email менеджера по X-Session-Id заголовку, или None если сессия не найдена."""
    headers = event.get('headers') or {}
    sid = headers.get('x-session-id') or headers.get('X-Session-Id') or ''
    if not sid:
        return None
    try:
        conn = db()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT u.email FROM {SCHEMA}.admin_sessions s"
                f" JOIN {SCHEMA}.admin_users u ON u.id = s.user_id"
                f" WHERE s.id = %s AND s.revoked = false AND s.expires_at > now() AND u.is_active = true",
                (sid,)
            )
            row = cur.fetchone()
            return row[0] if row else None
        finally:
            conn.close()
    except Exception:
        return None