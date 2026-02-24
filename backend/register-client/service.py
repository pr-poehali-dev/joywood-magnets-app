import re
import repository as repo


def register(cur, conn, name, phone, ozon_order_code):
    merged = False
    existing_id = None

    if ozon_order_code:
        ozon_prefix = re.split(r'[-\s]', ozon_order_code.strip())[0]

        if ozon_prefix and ozon_prefix.isdigit():
            row = repo.find_unregistered_by_ozon_prefix(cur, ozon_prefix)
            if row:
                existing_id = row[0]
                repo.merge_registration(cur, existing_id, name, phone, ozon_prefix)
                conn.commit()
                merged = True
            else:
                repo.log_event(cur, phone, 'ozon_code_not_matched', ozon_order_code)
                conn.commit()
                raise OzonCodeNotFound(
                    'К сожалению, система не нашла ваши заказы — возможно, они ещё не были совершены. '
                    'Если это не так, для выяснения свяжитесь с нами по номеру +79277760036'
                )

    if not merged:
        existing = repo.find_by_phone(cur, phone)
        if existing:
            existing_id = existing[0]
            repo.update_registration(cur, existing_id, name, ozon_order_code)
            conn.commit()
        else:
            channel = 'Ozon' if ozon_order_code else ''
            row = repo.insert_registration(cur, name, phone, channel, ozon_order_code)
            conn.commit()
            existing_id = row[0]

    event_name = 'registered_merged' if merged else 'registered_new'
    details = ozon_order_code or ''
    repo.log_event(cur, phone, event_name, details)
    conn.commit()

    return {'id': existing_id, 'merged': merged, 'message': 'Регистрация успешна'}


class OzonCodeNotFound(Exception):
    pass
