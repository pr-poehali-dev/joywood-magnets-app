SCHEMA = 't_p65563100_joywood_magnets_app'


def find_registration_by_phone(cur, digits_10):
    cur.execute(
        "SELECT id FROM %s.registrations "
        "WHERE regexp_replace(phone, '\\D', '', 'g') LIKE '%%%s%%' LIMIT 1"
        % (SCHEMA, digits_10)
    )
    row = cur.fetchone()
    return row[0] if row else None


def insert_consent(cur, reg_id, phone, policy_version, ip, user_agent):
    reg_id_sql = str(reg_id) if reg_id else 'NULL'
    cur.execute(
        "INSERT INTO %s.policy_consents (registration_id, phone, policy_version, ip_address, user_agent) "
        "VALUES (%s, '%s', '%s', '%s', '%s')" % (
            SCHEMA,
            reg_id_sql,
            phone.replace("'", "''"),
            policy_version[:100].replace("'", "''"),
            ip[:45].replace("'", "''"),
            user_agent[:500].replace("'", "''"),
        )
    )
