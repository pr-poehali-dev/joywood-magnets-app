SCHEMA = 't_p65563100_joywood_magnets_app'


def get_inventory(cur):
    cur.execute("SELECT breed, stars, category, stock, active FROM %s.magnet_inventory ORDER BY stars, breed" % SCHEMA)
    return {r[0]: {'stars': r[1], 'category': r[2], 'stock': r[3], 'active': r[4]} for r in cur.fetchall()}


def get_bonuses_for_client(cur, registration_id):
    cur.execute(
        "SELECT id, milestone_count, milestone_type, reward, given_at, order_id FROM %s.bonuses "
        "WHERE registration_id = %d ORDER BY given_at DESC" % (SCHEMA, int(registration_id))
    )
    return [
        {'id': r[0], 'milestone_count': r[1], 'milestone_type': r[2], 'reward': r[3], 'given_at': str(r[4]), 'order_id': r[5]}
        for r in cur.fetchall()
    ]


def get_magnets_for_client(cur, registration_id):
    cur.execute(
        "SELECT id, breed, stars, category, given_at, order_id, status FROM %s.client_magnets "
        "WHERE registration_id = %d ORDER BY given_at DESC" % (SCHEMA, int(registration_id))
    )
    return [
        {'id': r[0], 'breed': r[1], 'stars': r[2], 'category': r[3], 'given_at': str(r[4]), 'order_id': r[5], 'status': r[6]}
        for r in cur.fetchall()
    ]


def get_bonus_stock(cur, reward):
    cur.execute("SELECT stock FROM %s.bonus_stock WHERE reward = '%s'" % (SCHEMA, reward.replace("'", "''")))
    return cur.fetchone()


def insert_bonus(cur, registration_id, milestone_count, milestone_type, reward, order_id):
    order_id_sql = str(int(order_id)) if order_id else 'NULL'
    cur.execute(
        "INSERT INTO %s.bonuses (registration_id, milestone_count, milestone_type, reward, order_id) "
        "VALUES (%d, %d, '%s', '%s', %s) "
        "ON CONFLICT ON CONSTRAINT bonuses_unique DO NOTHING "
        "RETURNING id, given_at"
        % (SCHEMA, int(registration_id), int(milestone_count), milestone_type.replace("'", "''"), reward.replace("'", "''"), order_id_sql)
    )
    return cur.fetchone()


def decrement_bonus_stock(cur, reward):
    cur.execute(
        "UPDATE %s.bonus_stock SET stock = GREATEST(stock - 1, 0), updated_at = now() "
        "WHERE reward = '%s'" % (SCHEMA, reward.replace("'", "''"))
    )


def find_registration(cur, registration_id):
    cur.execute("SELECT id, phone FROM %s.registrations WHERE id = %d" % (SCHEMA, int(registration_id)))
    return cur.fetchone()


def has_breed(cur, registration_id, breed):
    cur.execute(
        "SELECT id FROM %s.client_magnets WHERE registration_id = %d AND breed = '%s' LIMIT 1"
        % (SCHEMA, int(registration_id), breed.replace("'", "''"))
    )
    return cur.fetchone() is not None


def get_breed_inventory(cur, breed):
    cur.execute(
        "SELECT stock, active FROM %s.magnet_inventory WHERE breed = '%s'"
        % (SCHEMA, breed.replace("'", "''"))
    )
    return cur.fetchone()


def get_last_order_id(cur, registration_id):
    cur.execute(
        "SELECT id FROM %s.orders WHERE registration_id = %d ORDER BY created_at DESC LIMIT 1"
        % (SCHEMA, int(registration_id))
    )
    row = cur.fetchone()
    return row[0] if row else None


def insert_magnet(cur, registration_id, phone, breed, stars, category, order_id, status):
    order_id_sql = str(order_id) if order_id else 'NULL'
    cur.execute(
        "INSERT INTO %s.client_magnets (registration_id, phone, breed, stars, category, order_id, status) "
        "VALUES (%d, '%s', '%s', %d, '%s', %s, '%s') RETURNING id, given_at"
        % (
            SCHEMA, int(registration_id), (phone or '').replace("'", "''"),
            breed.replace("'", "''"), int(stars),
            category.replace("'", "''"), order_id_sql, status,
        )
    )
    return cur.fetchone()


def decrement_magnet_stock(cur, breed):
    cur.execute(
        "UPDATE %s.magnet_inventory SET stock = GREATEST(stock - 1, 0), updated_at = now() WHERE breed = '%s'"
        % (SCHEMA, breed.replace("'", "''"))
    )


def delete_magnet(cur, magnet_id):
    cur.execute("DELETE FROM %s.client_magnets WHERE id = %d" % (SCHEMA, int(magnet_id)))


def get_magnet_by_id(cur, magnet_id):
    cur.execute(
        "SELECT id, breed FROM %s.client_magnets WHERE id = %d" % (SCHEMA, int(magnet_id))
    )
    return cur.fetchone()


def restore_magnet_stock(cur, breed):
    cur.execute(
        "UPDATE %s.magnet_inventory SET stock = stock + 1, updated_at = now() WHERE breed = '%s'"
        % (SCHEMA, breed.replace("'", "''"))
    )


def update_inventory_item(cur, breed, stars, category, stock):
    cur.execute(
        "INSERT INTO %s.magnet_inventory (breed, stars, category, stock, updated_at) "
        "VALUES ('%s', %d, '%s', %d, now()) "
        "ON CONFLICT (breed) DO UPDATE SET stock = %d, updated_at = now()"
        % (SCHEMA, breed.replace("'", "''"), int(stars), category.replace("'", "''"), int(stock), int(stock))
    )


def toggle_breed_active(cur, breed, active):
    cur.execute(
        "UPDATE %s.magnet_inventory SET active = %s, updated_at = now() WHERE breed = '%s'"
        % (SCHEMA, 'true' if active else 'false', breed.replace("'", "''"))
    )
