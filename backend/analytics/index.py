from utils import OPTIONS_RESPONSE, ok, db
import service


def handler(event, context):
    """GET — аналитика: топ клиентов по количеству и стоимости магнитов, распределение по категориям."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    conn = db()
    try:
        cur = conn.cursor()
        return ok(service.get_analytics(cur))
    finally:
        conn.close()
