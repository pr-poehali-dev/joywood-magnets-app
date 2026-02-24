from utils import OPTIONS_RESPONSE, ok, db
import repository as repo


def handler(event: dict, context) -> dict:
    """Список клиентов, давших согласие с политикой конфиденциальности"""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    conn = db()
    try:
        cur = conn.cursor()
        consents = [
            {
                'id': r[0], 'phone': r[1], 'name': r[2] or '—',
                'policy_version': r[3] or '—', 'ip': r[4] or '—',
                'created_at': str(r[5]),
            }
            for r in repo.get_consents(cur)
        ]
        return ok({'consents': consents})
    finally:
        conn.close()
