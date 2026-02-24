from utils import OPTIONS_RESPONSE, ok, db
import repository as repo


def handler(event: dict, context) -> dict:
    """GET — публичная статистика промо: количество участников и выданных магнитов."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    conn = db()
    try:
        cur = conn.cursor()
        row = repo.get_promo_stats(cur)
        return ok({'participants': int(row[0]), 'total_magnets': int(row[1])})
    finally:
        conn.close()
