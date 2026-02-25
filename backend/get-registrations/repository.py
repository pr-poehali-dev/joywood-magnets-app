SCHEMA = 't_p65563100_joywood_magnets_app'


def get_clients(cur, page=1, limit=50, q=''):
    where = ''
    if q:
        safe_q = q.replace("'", "''")
        where = (
            "WHERE LOWER(r.name) LIKE '%%%s%%' "
            "OR r.phone LIKE '%%%s%%' "
            "OR LOWER(r.channel) LIKE '%%%s%%' "
            "OR LOWER(r.ozon_order_code) LIKE '%%%s%%'"
        ) % (safe_q.lower(), safe_q, safe_q.lower(), safe_q.lower())

    cur.execute(
        "SELECT COUNT(*) FROM %s.registrations r %s" % (SCHEMA, where)
    )
    total = cur.fetchone()[0]

    offset = (page - 1) * limit
    cur.execute(
        "SELECT r.id, r.name, r.phone, r.channel, r.ozon_order_code, r.created_at, r.registered, "
        "COALESCE(SUM(o.amount), 0) as total_amount, "
        "array_remove(array_agg(DISTINCT o.channel), NULL) as channels, "
        "r.comment, r.created_by "
        "FROM %s.registrations r "
        "LEFT JOIN %s.orders o ON o.registration_id = r.id "
        "%s GROUP BY r.id ORDER BY r.created_at DESC LIMIT %d OFFSET %d"
        % (SCHEMA, SCHEMA, where, limit, offset)
    )
    return cur.fetchall(), total


def get_client_by_id(cur, client_id):
    cur.execute(
        "SELECT r.id, r.name, r.phone, r.channel, r.ozon_order_code, r.created_at, r.registered, "
        "COALESCE(SUM(o.amount), 0) as total_amount, "
        "array_remove(array_agg(DISTINCT o.channel), NULL) as channels, "
        "r.comment "
        "FROM %s.registrations r "
        "LEFT JOIN %s.orders o ON o.registration_id = r.id "
        "WHERE r.id = %d GROUP BY r.id" % (SCHEMA, SCHEMA, int(client_id))
    )
    return cur.fetchone()


def get_registrations_list(cur):
    cur.execute(
        "SELECT id, name, phone, registered FROM %s.registrations ORDER BY created_at DESC" % SCHEMA
    )
    return cur.fetchall()


def get_registration_stats_daily(cur):
    cur.execute(
        "SELECT DATE(created_at) as day, "
        "SUM(CASE WHEN LOWER(channel) = 'ozon' THEN 1 ELSE 0 END) as ozon "
        "FROM %s.registrations "
        "WHERE registered = TRUE AND LOWER(channel) = 'ozon' "
        "AND created_at >= NOW() - INTERVAL '30 days' "
        "GROUP BY day ORDER BY day ASC" % SCHEMA
    )
    return cur.fetchall()


def get_registration_stats_summary(cur):
    cur.execute(
        "SELECT "
        "SUM(CASE WHEN LOWER(channel) = 'ozon' THEN 1 ELSE 0 END) as ozon, "
        "SUM(CASE WHEN LOWER(channel) = 'ozon' AND DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END) as today, "
        "SUM(CASE WHEN LOWER(channel) = 'ozon' AND created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as this_week "
        "FROM %s.registrations WHERE registered = TRUE" % SCHEMA
    )
    return cur.fetchone()


def get_recent_registrations(cur):
    cur.execute(
        "SELECT r.id, r.name, r.phone, r.channel, r.registered, r.created_at, "
        "COALESCE(SUM(o.amount), 0) as total_amount, COUNT(o.id) as orders_count "
        "FROM %s.registrations r "
        "LEFT JOIN %s.orders o ON o.registration_id = r.id "
        "WHERE r.registered = TRUE AND LOWER(r.channel) = 'ozon' "
        "GROUP BY r.id ORDER BY r.created_at DESC" % (SCHEMA, SCHEMA)
    )
    return cur.fetchall()


def get_orders(cur, page=1, limit=50, q='', channel=''):
    conditions = []
    if q:
        safe_q = q.replace("'", "''")
        conditions.append(
            "(LOWER(r.name) LIKE '%%%s%%' OR r.phone LIKE '%%%s%%' OR LOWER(o.order_code) LIKE '%%%s%%')"
            % (safe_q.lower(), safe_q, safe_q.lower())
        )
    if channel == 'ozon':
        conditions.append("LOWER(o.channel) = 'ozon'")
    elif channel == 'other':
        conditions.append("LOWER(o.channel) != 'ozon'")

    where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''
    offset = (page - 1) * limit

    cur.execute(
        "SELECT COUNT(*) FROM %s.orders o "
        "LEFT JOIN %s.registrations r ON r.id = o.registration_id %s"
        % (SCHEMA, SCHEMA, where)
    )
    total = cur.fetchone()[0]

    cur.execute(
        "SELECT o.id, o.order_code, o.amount, o.channel, o.status, o.created_at, "
        "o.registration_id, r.name, r.phone, o.magnet_comment, o.comment, o.created_by "
        "FROM %s.orders o "
        "LEFT JOIN %s.registrations r ON r.id = o.registration_id "
        "%s ORDER BY o.created_at DESC LIMIT %d OFFSET %d"
        % (SCHEMA, SCHEMA, where, limit, offset)
    )
    return cur.fetchall(), total


def get_attention_clients(cur):
    cur.execute(
        "SELECT r.id, r.name, r.phone, r.ozon_order_code, r.created_at, "
        "COUNT(cm.id) as magnet_count, COUNT(o.id) as order_count "
        "FROM %s.registrations r "
        "LEFT JOIN %s.client_magnets cm ON cm.registration_id = r.id "
        "LEFT JOIN %s.orders o ON o.registration_id = r.id "
        "WHERE r.registered = TRUE "
        "GROUP BY r.id "
        "HAVING COUNT(cm.id) = 0 "
        "ORDER BY r.created_at DESC" % (SCHEMA, SCHEMA, SCHEMA)
    )
    return cur.fetchall()


def get_lookup_log(cur, event_filter, limit):
    where = "WHERE event = '%s'" % event_filter.replace("'", "''") if event_filter else ""
    cur.execute(
        "SELECT id, phone, event, details, created_at "
        "FROM %s.lookup_log "
        "%s ORDER BY created_at DESC LIMIT %d" % (SCHEMA, where, limit)
    )
    return cur.fetchall()


def get_lookup_log_counts(cur):
    cur.execute(
        "SELECT event, COUNT(*) FROM %s.lookup_log "
        "WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY event" % SCHEMA
    )
    return cur.fetchall()


def get_client_orders(cur, reg_id):
    cur.execute(
        "SELECT id, order_code, amount, channel, status, created_at, magnet_comment, comment "
        "FROM %s.orders WHERE registration_id = %d ORDER BY created_at DESC" % (SCHEMA, int(reg_id))
    )
    return cur.fetchall()