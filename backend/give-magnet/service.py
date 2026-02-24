import repository as repo


class MagnetError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def give_bonus(cur, conn, registration_id, milestone_count, milestone_type, reward, order_id):
    stock_row = repo.get_bonus_stock(cur, reward)
    if stock_row is None or stock_row[0] <= 0:
        raise MagnetError('Бонус «%s» закончился на складе' % reward)

    row = repo.insert_bonus(cur, registration_id, milestone_count, milestone_type, reward, order_id)
    if not row:
        conn.commit()
        raise MagnetError('Этот бонус уже был выдан', 409)

    repo.decrement_bonus_stock(cur, reward)
    conn.commit()
    return {'id': row[0], 'given_at': str(row[1])}


def give_magnet(cur, conn, registration_id, breed, stars, category):
    reg = repo.find_registration(cur, registration_id)
    if not reg:
        raise MagnetError('Клиент не найден', 404)

    if repo.has_breed(cur, registration_id, breed):
        raise MagnetError('Порода «%s» уже есть в коллекции этого клиента' % breed, 409)

    inv_row = repo.get_breed_inventory(cur, breed)
    current_stock = inv_row[0] if inv_row else 0
    if inv_row and not inv_row[1]:
        raise MagnetError('Магнит «%s» снят с участия в акции' % breed)
    if inv_row and current_stock <= 0:
        raise MagnetError('Магнит «%s» закончился на складе (остаток: 0)' % breed)

    phone = reg[1] or ''
    last_order_id = repo.get_last_order_id(cur, registration_id)
    row = repo.insert_magnet(cur, registration_id, phone, breed, stars, category, last_order_id, 'in_transit')
    repo.decrement_magnet_stock(cur, breed)
    conn.commit()

    return {'id': row[0], 'given_at': str(row[1]), 'phone': phone}


def remove_magnet(cur, conn, magnet_id):
    magnet = repo.get_magnet_by_id(cur, magnet_id)
    if not magnet:
        raise MagnetError('Магнит не найден', 404)
    repo.restore_magnet_stock(cur, magnet[1])
    repo.delete_magnet(cur, magnet_id)
    conn.commit()
    return {'ok': True}
