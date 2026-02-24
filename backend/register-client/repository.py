SCHEMA = 't_p65563100_joywood_magnets_app'


def find_unregistered_by_ozon_prefix(cur, prefix):
    cur.execute(
        "SELECT id, ozon_order_code FROM %s.registrations "
        "WHERE ozon_order_code IS NOT NULL "
        "AND ozon_order_code LIKE '%s%%' "
        "AND registered = FALSE "
        "ORDER BY id LIMIT 1"
        % (SCHEMA, prefix.replace("'", "''"))
    )
    return cur.fetchone()


def merge_registration(cur, reg_id, name, phone, ozon_prefix):
    display_name = ('%s %s' % (ozon_prefix, name)).replace("'", "''")
    cur.execute(
        "UPDATE %s.registrations SET name='%s', phone='%s', channel='Ozon', registered=TRUE WHERE id=%d"
        % (SCHEMA, display_name, phone.replace("'", "''"), reg_id)
    )


def find_by_phone(cur, phone):
    cur.execute(
        "SELECT id FROM %s.registrations WHERE phone='%s' LIMIT 1"
        % (SCHEMA, phone.replace("'", "''"))
    )
    return cur.fetchone()


def update_registration(cur, reg_id, name, ozon_order_code=None):
    ozon_part = (", ozon_order_code='%s'" % ozon_order_code.replace("'", "''")) if ozon_order_code else ''
    cur.execute(
        "UPDATE %s.registrations SET name='%s', registered=TRUE%s WHERE id=%d"
        % (SCHEMA, name.replace("'", "''"), ozon_part, reg_id)
    )


def insert_registration(cur, name, phone, channel, ozon_order_code):
    cur.execute(
        "INSERT INTO %s.registrations (name, phone, channel, ozon_order_code, registered) "
        "VALUES ('%s', '%s', '%s', %s, TRUE) RETURNING id, created_at"
        % (
            SCHEMA,
            name.replace("'", "''"),
            phone.replace("'", "''"),
            channel,
            "'" + ozon_order_code.replace("'", "''") + "'" if ozon_order_code else 'NULL',
        )
    )
    return cur.fetchone()


def log_event(cur, phone, event_name, details=''):
    cur.execute(
        "INSERT INTO %s.lookup_log (phone, event, details) VALUES ('%s', '%s', '%s')"
        % (SCHEMA, phone.replace("'", "''"), event_name, details.replace("'", "''"))
    )
