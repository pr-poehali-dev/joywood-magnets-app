import json
import re
from utils import OPTIONS_RESPONSE, ok, err, db


def handler(event, context):
    """Поиск выданных магнитов и бонусов клиента по номеру телефона"""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    if event.get('httpMethod') != 'POST':
        return err('Method not allowed', 405)

    body = json.loads(event.get('body', '{}'))
    raw_phone = (body.get('phone') or '').strip()
    digits = re.sub(r'\D', '', raw_phone)

    if len(digits) < 10:
        return err('Введите корректный номер телефона')

    conn = db()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT r.id, r.name, r.phone FROM registrations r "
            "WHERE regexp_replace(r.phone, '\\D', '', 'g') LIKE '%%%s%%' LIMIT 1"
            % digits[-10:]
        )
        reg = cur.fetchone()

        if not reg:
            cur.execute(
                "INSERT INTO t_p65563100_joywood_magnets_app.lookup_log (phone, event, details) "
                "VALUES ('%s', 'not_found', NULL)" % raw_phone.replace("'", "''")
            )
            conn.commit()
            return err('Участник с таким номером не найден. Сначала зарегистрируйтесь в акции.', 404)

        if body.get('check_only'):
            cur.execute("SELECT value FROM t_p65563100_joywood_magnets_app.settings WHERE key = 'privacy_policy_url'")
            policy_row = cur.fetchone()
            policy_url = (policy_row[0] if policy_row else '') or ''

            needs_consent = False
            policy_version = ''
            if policy_url:
                cur.execute(
                    "SELECT value FROM t_p65563100_joywood_magnets_app.settings WHERE key = 'privacy_policy_updated_at'"
                )
                ver_row = cur.fetchone()
                policy_version = ver_row[0] if ver_row else policy_url

                cur.execute(
                    "SELECT id FROM t_p65563100_joywood_magnets_app.policy_consents "
                    "WHERE registration_id = %d ORDER BY created_at DESC LIMIT 1" % reg[0]
                )
                needs_consent = cur.fetchone() is None

            return ok({'exists': True, 'needs_consent': needs_consent, 'policy_url': policy_url, 'policy_version': policy_version})

        cur.execute(
            "SELECT id, breed, stars, category, given_at, status FROM client_magnets "
            "WHERE registration_id = %d ORDER BY given_at DESC" % reg[0]
        )
        all_rows = cur.fetchall()
        magnets = [
            {'id': r[0], 'breed': r[1], 'stars': r[2], 'category': r[3], 'given_at': str(r[4]), 'status': r[5]}
            for r in all_rows if r[5] != 'in_transit'
        ]
        in_transit = [
            {'id': r[0], 'stars': r[2], 'category': r[3], 'given_at': str(r[4])}
            for r in all_rows if r[5] == 'in_transit'
        ]

        cur.execute("SELECT breed FROM magnet_inventory WHERE active = false")
        inactive_breeds = set(r[0] for r in cur.fetchall())

        cur.execute(
            "SELECT id, milestone_count, milestone_type, reward, given_at FROM bonuses "
            "WHERE registration_id = %d ORDER BY given_at DESC" % reg[0]
        )
        bonuses = [
            {'id': r[0], 'milestone_count': r[1], 'milestone_type': r[2], 'reward': r[3], 'given_at': str(r[4])}
            for r in cur.fetchall()
        ]

        total_magnets = len(magnets)
        unique_breeds = len(set(m['breed'] for m in magnets))
        total_in_transit = len(in_transit)

        # XP и уровни Енота-мастера
        XP_BY_STARS = {1: 10, 2: 25, 3: 50}
        total_xp = sum(XP_BY_STARS.get(m['stars'], 0) for m in magnets)

        LEVELS = [
            (0,    1, 'Сборщик щепы',       3),
            (50,   2, 'Сортировщик пород',  5),
            (200,  3, 'Шлифовщик',          7),
            (450,  4, 'Столяр на опыте',    10),
            (800,  5, 'Хранитель секретов', 12),
            (1000, 6, 'Резчик по легендам', 15),
        ]
        current_level_data = LEVELS[0]
        for lvl in LEVELS:
            if total_xp >= lvl[0]:
                current_level_data = lvl
        next_level_data = next((l for l in LEVELS if l[1] > current_level_data[1]), None)

        level_num = current_level_data[1]
        level_name = current_level_data[2]
        empty_slots = current_level_data[3]
        xp_current_floor = current_level_data[0]
        xp_next_floor = next_level_data[0] if next_level_data else current_level_data[0]
        xp_for_level = total_xp - xp_current_floor
        xp_needed = xp_next_floor - xp_current_floor if next_level_data else 0

        # Слоты = собрано + пустые (никогда меньше пустых по уровню)
        total_slots = unique_breeds + empty_slots

        cv_formula = "COALESCE(SUM(CASE cm2.stars WHEN 1 THEN 150 WHEN 2 THEN 350 WHEN 3 THEN 700 ELSE 0 END), 0)"

        cur.execute("""
            SELECT
                r2.id,
                COUNT(cm2.id) AS total_magnets,
                %s AS collection_value
            FROM t_p65563100_joywood_magnets_app.registrations r2
            LEFT JOIN t_p65563100_joywood_magnets_app.client_magnets cm2 ON cm2.registration_id = r2.id
            WHERE r2.registered = true
            GROUP BY r2.id
        """ % cv_formula)
        all_stats = cur.fetchall()

        sorted_by_magnets = sorted(all_stats, key=lambda x: x[1], reverse=True)
        sorted_by_value = sorted(all_stats, key=lambda x: float(x[2]), reverse=True)

        rank_magnets = next((i + 1 for i, x in enumerate(sorted_by_magnets) if x[0] == reg[0]), None)
        rank_value = next((i + 1 for i, x in enumerate(sorted_by_value) if x[0] == reg[0]), None)
        total_participants = len(all_stats)

        cur.execute("""
            SELECT r2.name, COUNT(cm2.id) AS total_magnets, %s AS collection_value
            FROM t_p65563100_joywood_magnets_app.registrations r2
            LEFT JOIN t_p65563100_joywood_magnets_app.client_magnets cm2 ON cm2.registration_id = r2.id
            WHERE r2.registered = true
            GROUP BY r2.id, r2.name
            ORDER BY total_magnets DESC
            LIMIT 3
        """ % cv_formula)
        top_magnets = [
            {'name': r[0], 'total_magnets': r[1], 'collection_value': int(r[2])}
            for r in cur.fetchall()
        ]

        cur.execute("""
            SELECT r2.name, COUNT(cm2.id) AS total_magnets, %s AS collection_value
            FROM t_p65563100_joywood_magnets_app.registrations r2
            LEFT JOIN t_p65563100_joywood_magnets_app.client_magnets cm2 ON cm2.registration_id = r2.id
            WHERE r2.registered = true
            GROUP BY r2.id, r2.name
            ORDER BY collection_value DESC
            LIMIT 3
        """ % cv_formula)
        top_value = [
            {'name': r[0], 'total_magnets': r[1], 'collection_value': int(r[2])}
            for r in cur.fetchall()
        ]

        my_stats = next((x for x in all_stats if x[0] == reg[0]), None)
        my_collection_value = int(my_stats[2]) if my_stats else 0

        return ok({
            'client_name': reg[1], 'phone': reg[2],
            'magnets': magnets, 'total_magnets': total_magnets,
            'unique_breeds': unique_breeds,
            'in_transit': in_transit, 'total_in_transit': total_in_transit,
            'bonuses': bonuses,
            'inactive_breeds': list(inactive_breeds),
            'raccoon': {
                'xp': total_xp,
                'level': level_num,
                'level_name': level_name,
                'xp_for_level': xp_for_level,
                'xp_needed': xp_needed,
                'empty_slots': empty_slots,
                'total_slots': total_slots,
                'is_max_level': next_level_data is None,
            },
            'rating': {
                'rank_magnets': rank_magnets,
                'rank_value': rank_value,
                'total_participants': total_participants,
                'my_collection_value': my_collection_value,
                'top_magnets': top_magnets,
                'top_value': top_value,
            },
        })
    finally:
        conn.close()