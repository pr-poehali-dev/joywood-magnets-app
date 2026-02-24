SCHEMA = 't_p65563100_joywood_magnets_app'


def get_stock(cur):
    cur.execute("SELECT reward, stock FROM %s.bonus_stock ORDER BY reward" % SCHEMA)
    return {r[0]: r[1] for r in cur.fetchall()}


def upsert_stock(cur, reward, stock):
    cur.execute(
        "INSERT INTO %s.bonus_stock (reward, stock, updated_at) VALUES ('%s', %d, now()) "
        "ON CONFLICT (reward) DO UPDATE SET stock = %d, updated_at = now()"
        % (SCHEMA, reward.replace("'", "''"), int(stock), int(stock))
    )
