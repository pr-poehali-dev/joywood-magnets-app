import repository as repo

MILESTONES = [
    {'count': 5,  'type': 'magnets', 'reward': 'Кисть для клея Titebrush TM Titebond'},
    {'count': 10, 'type': 'breeds',  'reward': 'Клей Titebond III 473 мл'},
    {'count': 30, 'type': 'breeds',  'reward': 'Клей Titebond III 946 мл'},
    {'count': 50, 'type': 'breeds',  'reward': 'Клей Titebond III 3,785 л'},
]


def get_pending_bonuses(cur, registration_id, total_magnets, unique_breeds):
    given = repo.get_given_milestones(cur, registration_id)
    return [
        m for m in MILESTONES
        if (total_magnets if m['type'] == 'magnets' else unique_breeds) >= m['count']
        and (m['count'], m['type']) not in given
    ]


def create_order_by_ozon_code(cur, conn, order_number, channel, amount):
    if repo.order_exists_by_code(cur, order_number):
        raise ClientError('Заказ с таким номером уже существует', 409)

    prefix = order_number.split('-')[0].strip()
    row = repo.find_registration_by_ozon_prefix(cur, prefix)

    if row:
        cid, name, phone, existing_code, registered = row
        if repo.order_exists_for_client(cur, cid, order_number):
            raise ClientError('Заказ с таким номером уже существует', 409)

        if order_number not in (existing_code or ''):
            repo.append_ozon_code(cur, cid, order_number, existing_code or '')

        magnet_given_today = repo.has_magnet_given_today(cur, cid)
        ord_row = repo.insert_order(cur, cid, order_number, amount, channel)
        conn.commit()

        pending_bonuses = []
        if registered:
            total_magnets = repo.count_magnets(cur, cid)
            unique_breeds = repo.count_unique_breeds(cur, cid)
            pending_bonuses = get_pending_bonuses(cur, cid, total_magnets, unique_breeds)

        return {
            'client_id': cid, 'client_name': name, 'client_phone': phone or '',
            'order_id': ord_row[0], 'order_code': order_number, 'amount': amount,
            'channel': channel, 'created_at': str(ord_row[1]), 'status': ord_row[2] or 'active',
            'is_new': False, 'registered': registered, 'pending_bonuses': pending_bonuses,
            'magnet_given_today': magnet_given_today,
            'message': 'Заказ добавлен к существующему клиенту',
        }
    else:
        client_name = 'Клиент ' + prefix
        reg_row = repo.insert_registration(cur, client_name, '', channel, order_number, False)
        new_id = reg_row[0]
        ord_row = repo.insert_order(cur, new_id, order_number, amount, channel)
        order_id = ord_row[0]
        repo.give_paduk(cur, new_id, '', order_id)
        conn.commit()
        return {
            'client_id': new_id, 'client_name': client_name, 'client_phone': '',
            'order_id': order_id, 'order_code': order_number, 'amount': amount,
            'channel': channel, 'created_at': str(ord_row[1]), 'status': ord_row[2] or 'active',
            'is_new': True, 'registered': False, 'pending_bonuses': [], 'magnet_given': 'Падук',
            'message': 'Создан новый клиент',
        }


def create_order_for_client(cur, conn, client_id, order_code, channel, amount):
    row = repo.find_registration(cur, client_id)
    if not row:
        raise ClientError('Клиент не найден', 404)

    registered = bool(row[3])
    existing_orders = repo.count_orders(cur, client_id)
    magnet_given_today = repo.has_magnet_given_today(cur, client_id)
    ord_row = repo.insert_order(cur, client_id, order_code, amount, channel)
    order_id = ord_row[0]

    if existing_orders == 0:
        repo.give_paduk(cur, client_id, row[2] or '', order_id)

    conn.commit()

    pending_bonuses = []
    if registered:
        total_magnets = repo.count_magnets(cur, client_id)
        unique_breeds = repo.count_unique_breeds(cur, client_id)
        pending_bonuses = get_pending_bonuses(cur, client_id, total_magnets, unique_breeds)

    return {
        'client_id': client_id, 'client_name': row[1], 'client_phone': row[2] or '',
        'order_id': order_id, 'order_code': order_code or '', 'amount': amount,
        'channel': channel, 'created_at': str(ord_row[1]), 'status': ord_row[2] or 'active',
        'is_new': False, 'registered': registered,
        'is_first_order': existing_orders == 0,
        'magnet_given': 'Падук' if existing_orders == 0 else None,
        'magnet_given_today': magnet_given_today,
        'pending_bonuses': pending_bonuses, 'message': 'Заказ оформлен',
    }


def delete_order(cur, conn, order_id, return_magnets, return_bonuses):
    magnets = repo.get_order_magnets(cur, order_id)
    removed_breeds = []
    for m in magnets:
        if return_magnets:
            repo.restore_magnet_stock(cur, m[1])
        repo.delete_magnet(cur, m[0])
        removed_breeds.append(m[1])

    bonuses = repo.get_order_bonuses(cur, order_id)
    returned_bonuses = []
    for b in bonuses:
        if return_bonuses:
            repo.restore_bonus_stock(cur, b[1])
        repo.delete_bonus(cur, b[0])
        returned_bonuses.append(b[1])

    repo.delete_order(cur, order_id)
    conn.commit()
    return {
        'ok': True,
        'magnet_removed': len(removed_breeds) > 0,
        'magnets_removed': removed_breeds,
        'bonuses_removed': returned_bonuses,
    }


def update_client(cur, conn, client_id, name, phone):
    updates = []
    if name:
        updates.append("name = '%s'" % name.replace("'", "''"))
    if phone:
        updates.append("phone = '%s'" % phone.replace("'", "''"))

    has_real_data = (name and len(name) >= 2) or (
        phone and len(phone.replace(' ', '').replace('(', '').replace(')', '').replace('-', '').replace('+', '')) >= 11
    )
    if has_real_data:
        updates.append("registered = TRUE")

    repo.update_registration(cur, client_id, ', '.join(updates))
    conn.commit()

    row = repo.get_registration_full(cur, client_id)
    return {'ok': True, 'client': {
        'id': row[0], 'name': row[1], 'phone': row[2],
        'channel': row[3], 'ozon_order_code': row[4], 'registered': row[5],
    }}


class ClientError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status