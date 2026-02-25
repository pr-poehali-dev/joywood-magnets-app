import os
import json
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
import psycopg2

SCHEMA = "t_p65563100_joywood_magnets_app"
SESSION_TTL_HOURS = 10
RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW_MIN = 15
RATE_LIMIT_BLOCK_MIN = 15
MIN_PASSWORD_LEN = 10

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    "Access-Control-Max-Age": "86400",
}


def handler(event: dict, context) -> dict:
    """Авторизация администраторов: login, logout, me, users CRUD, audit log"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    method = event.get("httpMethod", "GET")

    # Сессия из cookie или заголовка X-Session-Id
    session_id = _get_session_id(event)

    if action == "login" and method == "POST":
        return _login(event)
    if action == "logout" and method == "POST":
        return _logout(session_id, event)
    if action == "me":
        return _me(session_id)
    if action == "change_password" and method == "POST":
        return _change_password(session_id, event)
    if action == "setup_admin" and method == "POST":
        return _setup_admin(event)


    # Все actions ниже требуют авторизации
    user = _require_session(session_id)
    if isinstance(user, dict) and "statusCode" in user:
        return user

    if action == "users" and method == "GET":
        return _require_admin(user, lambda: _list_users(user))
    if action == "users" and method == "POST":
        return _require_admin(user, lambda: _create_user(user, event))
    if action == "users" and method == "PUT":
        return _require_admin(user, lambda: _update_user(user, event, params))
    if action == "audit" and method == "GET":
        return _require_admin(user, lambda: _get_audit(params))

    return _resp(404, {"error": "Неизвестный action"})


# ─── AUTH ────────────────────────────────────────────────────────────────────

def _setup_admin(event):
    """Одноразовая установка пароля для первого admin через старый ADMIN_PASSWORD секрет"""
    body = json.loads(event.get("body") or "{}")
    old_secret = os.environ.get("ADMIN_PASSWORD", "")
    token = body.get("token") or ""
    new_pw = body.get("new_password") or ""
    email = (body.get("email") or "admin@joywood.fun").strip().lower()

    if not old_secret or token != old_secret:
        return _resp(403, {"error": "Неверный токен"})
    if len(new_pw) < MIN_PASSWORD_LEN:
        return _resp(400, {"error": f"Пароль должен быть минимум {MIN_PASSWORD_LEN} символов"})

    pw_hash = _hash_password(new_pw)
    conn = _db()
    try:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.admin_users SET password_hash = %s, force_password_change = false WHERE email = %s",
            (pw_hash, email)
        )
        if cur.rowcount == 0:
            return _resp(404, {"error": f"Пользователь {email} не найден"})
        conn.commit()
        return _resp(200, {"ok": True, "email": email})
    finally:
        conn.close()


def _login(event):
    body = json.loads(event.get("body") or "{}")
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    ip = (event.get("requestContext") or {}).get("identity", {}).get("sourceIp") or ""
    ua = (event.get("headers") or {}).get("user-agent", "")

    if not email or not password:
        return _resp(400, {"error": "Введите email и пароль"})

    rate_key = f"{ip}:{email}"
    conn = _db()
    try:
        cur = conn.cursor()

        # Проверка блокировки
        if _is_blocked(cur, rate_key):
            _audit(cur, None, "login_blocked", email, ip, ua)
            conn.commit()
            return _resp(429, {"error": "Слишком много попыток. Попробуйте через 15 минут."})

        # Поиск пользователя
        cur.execute(
            f"SELECT id, password_hash, role, is_active, force_password_change FROM {SCHEMA}.admin_users WHERE email = %s",
            (email,)
        )
        row = cur.fetchone()

        if not row or not _check_password(password, row[1]) or not row[3]:
            _record_attempt(cur, rate_key)
            _audit(cur, None, "login_fail", email, ip, ua)
            conn.commit()
            return _resp(401, {"error": "Неверные данные для входа"})

        user_id, _, role, _, force_pw = row

        # Создаём сессию
        sid = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)
        cur.execute(
            f"INSERT INTO {SCHEMA}.admin_sessions (id, user_id, expires_at, ip, user_agent) VALUES (%s, %s, %s, %s, %s)",
            (sid, user_id, expires, ip, ua)
        )
        cur.execute(
            f"UPDATE {SCHEMA}.admin_users SET last_login_at = now() WHERE id = %s",
            (user_id,)
        )
        _audit(cur, user_id, "login_success", email, ip, ua)
        conn.commit()

        cookie = f"jw_admin_sid={sid}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age={SESSION_TTL_HOURS * 3600}"
        return {
            "statusCode": 200,
            "headers": {**CORS, "X-Set-Cookie": cookie, "Content-Type": "application/json"},
            "body": json.dumps({"ok": True, "role": role, "force_password_change": force_pw, "session_id": sid}),
        }
    finally:
        conn.close()


def _logout(session_id, event):
    if not session_id:
        return _resp(200, {"ok": True})
    ip = (event.get("requestContext") or {}).get("identity", {}).get("sourceIp") or ""
    ua = (event.get("headers") or {}).get("user-agent", "")
    conn = _db()
    try:
        cur = conn.cursor()
        cur.execute(f"SELECT user_id FROM {SCHEMA}.admin_sessions WHERE id = %s AND revoked = false", (session_id,))
        row = cur.fetchone()
        if row:
            cur.execute(f"UPDATE {SCHEMA}.admin_sessions SET revoked = true WHERE id = %s", (session_id,))
            _audit(cur, row[0], "logout", None, ip, ua)
            conn.commit()
        cookie = "jw_admin_sid=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
        return {
            "statusCode": 200,
            "headers": {**CORS, "X-Set-Cookie": cookie, "Content-Type": "application/json"},
            "body": json.dumps({"ok": True}),
        }
    finally:
        conn.close()


def _me(session_id):
    if not session_id:
        return _resp(401, {"error": "Не авторизован"})
    conn = _db()
    try:
        cur = conn.cursor()
        user = _session_user(cur, session_id)
        if not user:
            return _resp(401, {"error": "Сессия истекла"})
        return _resp(200, {"user": user})
    finally:
        conn.close()


def _change_password(session_id, event):
    body = json.loads(event.get("body") or "{}")
    new_pw = body.get("new_password") or ""
    ip = (event.get("requestContext") or {}).get("identity", {}).get("sourceIp") or ""
    ua = (event.get("headers") or {}).get("user-agent", "")

    if not session_id:
        return _resp(401, {"error": "Не авторизован"})
    if len(new_pw) < MIN_PASSWORD_LEN:
        return _resp(400, {"error": f"Пароль должен быть минимум {MIN_PASSWORD_LEN} символов"})

    conn = _db()
    try:
        cur = conn.cursor()
        user = _session_user(cur, session_id)
        if not user:
            return _resp(401, {"error": "Сессия истекла"})
        pw_hash = _hash_password(new_pw)
        cur.execute(
            f"UPDATE {SCHEMA}.admin_users SET password_hash = %s, force_password_change = false WHERE id = %s",
            (pw_hash, user["id"])
        )
        _audit(cur, user["id"], "password_changed", user["email"], ip, ua)
        conn.commit()
        return _resp(200, {"ok": True})
    finally:
        conn.close()


# ─── USERS MANAGEMENT ────────────────────────────────────────────────────────

def _list_users(actor):
    conn = _db()
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, email, role, is_active, force_password_change, created_at, last_login_at FROM {SCHEMA}.admin_users ORDER BY created_at"
        )
        users = [
            {
                "id": r[0], "email": r[1], "role": r[2], "is_active": r[3],
                "force_password_change": r[4], "created_at": str(r[5]),
                "last_login_at": str(r[6]) if r[6] else None,
            }
            for r in cur.fetchall()
        ]
        return _resp(200, {"users": users})
    finally:
        conn.close()


def _create_user(actor, event):
    body = json.loads(event.get("body") or "{}")
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    role = body.get("role") or "manager"
    ip = (event.get("requestContext") or {}).get("identity", {}).get("sourceIp") or ""
    ua = (event.get("headers") or {}).get("user-agent", "")

    if not email or not password:
        return _resp(400, {"error": "email и password обязательны"})
    if len(password) < MIN_PASSWORD_LEN:
        return _resp(400, {"error": f"Пароль должен быть минимум {MIN_PASSWORD_LEN} символов"})
    if role not in ("admin", "manager"):
        return _resp(400, {"error": "role должна быть admin или manager"})

    conn = _db()
    try:
        cur = conn.cursor()
        pw_hash = _hash_password(password)
        cur.execute(
            f"INSERT INTO {SCHEMA}.admin_users (email, password_hash, role, force_password_change) VALUES (%s, %s, %s, true) RETURNING id",
            (email, pw_hash, role)
        )
        new_id = cur.fetchone()[0]
        _audit(cur, actor["id"], "user_created", f"{email} role={role}", ip, ua)
        conn.commit()
        return _resp(201, {"ok": True, "id": new_id})
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return _resp(409, {"error": "Пользователь с таким email уже существует"})
    finally:
        conn.close()


def _update_user(actor, event, params):
    body = json.loads(event.get("body") or "{}")
    user_id = int(params.get("id") or 0)
    ip = (event.get("requestContext") or {}).get("identity", {}).get("sourceIp") or ""
    ua = (event.get("headers") or {}).get("user-agent", "")

    if not user_id:
        return _resp(400, {"error": "Укажите id"})
    if user_id == actor["id"] and body.get("is_active") is False:
        return _resp(400, {"error": "Нельзя деактивировать себя"})

    conn = _db()
    try:
        cur = conn.cursor()
        updates = []
        values = []

        if "is_active" in body:
            updates.append("is_active = %s")
            values.append(bool(body["is_active"]))

        if "role" in body and body["role"] in ("admin", "manager"):
            updates.append("role = %s")
            values.append(body["role"])

        if "password" in body:
            pw = body["password"]
            if len(pw) < MIN_PASSWORD_LEN:
                return _resp(400, {"error": f"Пароль должен быть минимум {MIN_PASSWORD_LEN} символов"})
            updates.append("password_hash = %s")
            updates.append("force_password_change = true")
            values.append(_hash_password(pw))

        if not updates:
            return _resp(400, {"error": "Нет данных для обновления"})

        values.append(user_id)
        cur.execute(
            f"UPDATE {SCHEMA}.admin_users SET {', '.join(updates)} WHERE id = %s",
            values
        )
        _audit(cur, actor["id"], "user_updated", f"id={user_id} {list(body.keys())}", ip, ua)
        conn.commit()
        return _resp(200, {"ok": True})
    finally:
        conn.close()


def _get_audit(params):
    limit = min(int(params.get("limit", 100)), 500)
    conn = _db()
    try:
        cur = conn.cursor()
        cur.execute(
            f"""SELECT a.id, a.ts, a.actor_user_id, u.email, a.action, a.target, a.ip
                FROM {SCHEMA}.admin_audit_log a
                LEFT JOIN {SCHEMA}.admin_users u ON u.id = a.actor_user_id
                ORDER BY a.ts DESC LIMIT %s""",
            (limit,)
        )
        log = [
            {"id": r[0], "ts": str(r[1]), "actor_id": r[2], "actor_email": r[3],
             "action": r[4], "target": r[5], "ip": r[6]}
            for r in cur.fetchall()
        ]
        return _resp(200, {"log": log})
    finally:
        conn.close()


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def _db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def _get_session_id(event):
    # Из cookie (через прокси X-Cookie)
    cookie_header = (event.get("headers") or {}).get("x-cookie", "") or (event.get("headers") or {}).get("cookie", "")
    for part in cookie_header.split(";"):
        part = part.strip()
        if part.startswith("jw_admin_sid="):
            return part[len("jw_admin_sid="):]
    # Из заголовка X-Session-Id (fallback для фронтенда без cookie)
    return (event.get("headers") or {}).get("x-session-id", "")


def _session_user(cur, session_id):
    if not session_id:
        return None
    cur.execute(
        f"""SELECT u.id, u.email, u.role, u.is_active, u.force_password_change
            FROM {SCHEMA}.admin_sessions s
            JOIN {SCHEMA}.admin_users u ON u.id = s.user_id
            WHERE s.id = %s AND s.revoked = false AND s.expires_at > now() AND u.is_active = true""",
        (session_id,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "email": row[1], "role": row[2], "is_active": row[3], "force_password_change": row[4]}


def _require_session(session_id):
    conn = _db()
    try:
        cur = conn.cursor()
        user = _session_user(cur, session_id)
        if not user:
            return _resp(401, {"error": "Требуется авторизация"})
        return user
    finally:
        conn.close()


def _require_admin(user, fn):
    if user["role"] != "admin":
        return _resp(403, {"error": "Недостаточно прав"})
    return fn()


def _is_blocked(cur, key):
    window = datetime.now(timezone.utc) - timedelta(minutes=RATE_LIMIT_WINDOW_MIN)
    cur.execute(
        f"SELECT COUNT(*) FROM {SCHEMA}.admin_rate_limit WHERE key = %s AND attempt_at > %s",
        (key, window)
    )
    count = cur.fetchone()[0]
    return count >= RATE_LIMIT_MAX


def _record_attempt(cur, key):
    cur.execute(f"INSERT INTO {SCHEMA}.admin_rate_limit (key) VALUES (%s)", (key,))


def _audit(cur, actor_id, action, target, ip, ua):
    cur.execute(
        f"INSERT INTO {SCHEMA}.admin_audit_log (actor_user_id, action, target, ip, user_agent) VALUES (%s, %s, %s, %s, %s)",
        (actor_id, action, target, ip, ua)
    )


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
    return f"pbkdf2:sha256:260000:{salt}:{h.hex()}"


def _check_password(password: str, stored: str) -> bool:
    try:
        parts = stored.split(":")
        if len(parts) != 5 or parts[0] != "pbkdf2":
            return False
        _, algo, iterations, salt, expected = parts
        h = hashlib.pbkdf2_hmac(algo, password.encode(), salt.encode(), int(iterations))
        return secrets.compare_digest(h.hex(), expected)
    except Exception:
        return False


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False),
    }