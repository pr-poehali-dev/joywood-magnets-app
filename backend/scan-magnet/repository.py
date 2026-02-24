SCHEMA = 't_p65563100_joywood_magnets_app'


def find_registration_by_phone(cur, digits_10):
    cur.execute(
        "SELECT r.id, r.name, r.phone FROM %s.registrations r "
        "WHERE regexp_replace(r.phone, '\\D', '', 'g') LIKE '%%%s%%' LIMIT 1"
        % (SCHEMA, digits_10)
    )
    return cur.fetchone()


def get_magnet_by_breed(cur, registration_id, breed):
    cur.execute(
        "SELECT id, status, stars, category FROM %s.client_magnets "
        "WHERE registration_id = %d AND breed = '%s' LIMIT 1"
        % (SCHEMA, registration_id, breed.replace("'", "''"))
    )
    return cur.fetchone()


def breed_is_active(cur, breed):
    cur.execute(
        "SELECT breed FROM %s.magnet_inventory WHERE breed = '%s' AND active = true LIMIT 1"
        % (SCHEMA, breed.replace("'", "''"))
    )
    return cur.fetchone() is not None


def reveal_magnet(cur, magnet_id):
    cur.execute(
        "UPDATE %s.client_magnets SET status = 'revealed' WHERE id = %d" % (SCHEMA, magnet_id)
    )
