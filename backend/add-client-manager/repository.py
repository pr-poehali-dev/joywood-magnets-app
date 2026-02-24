SCHEMA = 't_p65563100_joywood_magnets_app'


def find_registration(cur, reg_id):
    cur.execute(
        "SELECT id, name, phone, registered FROM %s.registrations WHERE id = %d" % (SCHEMA, int(reg_id))
    )
    return cur.fetchone()


def find_registration_by_ozon_prefix(cur, prefix):
    cur.execute(
        "SELECT id, name, phone, ozon_order_code, registered FROM %s.registrations "
        "WHERE ozon_order_code IS NOT NULL "
        "AND split_part(ozon_order_code, '-', 1) = '%s' ORDER BY id LIMIT 1"
        % (SCHEMA, prefix.replace("'", "''"))
    )
    return cur.fetchone()


def order_exists_by_code(cur, order_code):
    cur.execute(
        "SELECT id FROM %s.orders WHERE order_code = '%s' LIMIT 1"
        % (SCHEMA, order_code.replace("'", "''"))
    )
    return cur.fetchone() is not None


def order_exists_for_client(cur, reg_id, order_code):
    cur.execute(
        "SELECT id FROM %s.orders WHERE registration_id = %d AND order_code = '%s' LIMIT 1"
        % (SCHEMA, int(reg_id), order_code.replace("'", "''"))
    )
    return cur.fetchone() is not None


def count_orders(cur, reg_id):
    cur.execute("SELECT COUNT(*) FROM %s.orders WHERE registration_id = %d" % (SCHEMA, int(reg_id)))
    return cur.fetchone()[0]


def count_magnets(cur, reg_id):
    cur.execute("SELECT COUNT(*) FROM %s.client_magnets WHERE registration_id = %d" % (SCHEMA, int(reg_id)))
    return cur.fetchone()[0]


def count_unique_breeds(cur, reg_id):
    cur.execute("SELECT COUNT(DISTINCT breed) FROM %s.client_magnets WHERE registration_id = %d" % (SCHEMA, int(reg_id)))
    return cur.fetchone()[0]


def get_given_milestones(cur, reg_id):
    cur.execute(
        "SELECT milestone_count, milestone_type FROM %s.bonuses WHERE registration_id = %d" % (SCHEMA, int(reg_id))
    )
    return set((r[0], r[1]) for r in cur.fetchall())


def append_ozon_code(cur, reg_id, new_code, existing_code):
    codes = existing_code + ', ' + new_code if existing_code else new_code
    cur.execute(
        "UPDATE %s.registrations SET ozon_order_code = '%s' WHERE id = %d"
        % (SCHEMA, codes.replace("'", "''"), int(reg_id))
    )


def insert_order(cur, reg_id, order_code, amount, channel):
    code_sql = ("'" + order_code.replace("'", "''") + "'") if order_code else 'NULL'
    cur.execute(
        "INSERT INTO %s.orders (registration_id, order_code, amount, channel) "
        "VALUES (%d, %s, %s, '%s') RETURNING id, created_at, status"
        % (SCHEMA, int(reg_id), code_sql, amount, channel.replace("'", "''"))
    )
    return cur.fetchone()


def insert_registration(cur, name, phone, channel, ozon_order_code, registered):
    cur.execute(
        "INSERT INTO %s.registrations (name, phone, channel, ozon_order_code, registered) "
        "VALUES ('%s', '%s', '%s', %s, %s) RETURNING id, created_at"
        % (
            SCHEMA,
            name.replace("'", "''"), phone.replace("'", "''"), channel.replace("'", "''"),
            "'" + ozon_order_code.replace("'", "''") + "'" if ozon_order_code else 'NULL',
            'TRUE' if registered else 'FALSE',
        )
    )
    return cur.fetchone()


def update_registration(cur, reg_id, updates_sql):
    cur.execute("UPDATE %s.registrations SET %s WHERE id = %d" % (SCHEMA, updates_sql, int(reg_id)))


def get_registration_full(cur, reg_id):
    cur.execute(
        "SELECT id, name, phone, channel, ozon_order_code, registered FROM %s.registrations WHERE id = %d"
        % (SCHEMA, int(reg_id))
    )
    return cur.fetchone()


def get_order_full(cur, order_id):
    cur.execute(
        "SELECT id, order_code, amount, channel, status, created_at, comment, magnet_comment "
        "FROM %s.orders WHERE id = %d" % (SCHEMA, int(order_id))
    )
    return cur.fetchone()


def delete_client_cascade(cur, reg_id):
    for table in ('client_magnets', 'bonuses', 'orders', 'policy_consents'):
        cur.execute(
            "DELETE FROM %s.%s WHERE registration_id = %d" % (SCHEMA, table, int(reg_id))
        )
    cur.execute("DELETE FROM %s.registrations WHERE id = %d" % (SCHEMA, int(reg_id)))


def get_order_magnets(cur, order_id):
    cur.execute(
        "SELECT id, breed FROM %s.client_magnets WHERE order_id = %d" % (SCHEMA, int(order_id))
    )
    return cur.fetchall()


def get_order_bonuses(cur, order_id):
    cur.execute(
        "SELECT id, reward FROM %s.bonuses WHERE order_id = %d" % (SCHEMA, int(order_id))
    )
    return cur.fetchall()


def restore_magnet_stock(cur, breed):
    cur.execute(
        "UPDATE %s.magnet_inventory SET stock = stock + 1, updated_at = now() WHERE breed = '%s'"
        % (SCHEMA, breed.replace("'", "''"))
    )


def delete_magnet(cur, magnet_id):
    cur.execute("DELETE FROM %s.client_magnets WHERE id = %d" % (SCHEMA, int(magnet_id)))


def restore_bonus_stock(cur, reward):
    cur.execute(
        "INSERT INTO %s.bonus_stock (reward, stock, updated_at) VALUES ('%s', 1, now()) "
        "ON CONFLICT (reward) DO UPDATE SET stock = bonus_stock.stock + 1, updated_at = now()"
        % (SCHEMA, reward.replace("'", "''"))
    )


def delete_bonus(cur, bonus_id):
    cur.execute("DELETE FROM %s.bonuses WHERE id = %d" % (SCHEMA, int(bonus_id)))


def delete_order(cur, order_id):
    cur.execute("DELETE FROM %s.orders WHERE id = %d" % (SCHEMA, int(order_id)))


def give_paduk(cur, registration_id, phone, order_id):
    cur.execute(
        "SELECT id FROM %s.client_magnets WHERE registration_id = %d AND breed = 'Падук' LIMIT 1"
        % (SCHEMA, int(registration_id))
    )
    if cur.fetchone():
        return
    cur.execute(
        "INSERT INTO %s.client_magnets (registration_id, phone, breed, stars, category, order_id, status) "
        "VALUES (%d, '%s', 'Падук', 2, 'Особенный', %d, 'in_transit')"
        % (SCHEMA, int(registration_id), (phone or '').replace("'", "''"), int(order_id))
    )
    cur.execute(
        "UPDATE %s.magnet_inventory SET stock = GREATEST(stock - 1, 0), updated_at = now() "
        "WHERE breed = 'Падук' AND stock > 0" % SCHEMA
    )
