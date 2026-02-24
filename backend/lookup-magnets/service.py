import time
import repository as repo

_rating_cache = None
_rating_cache_ts = 0
_RATING_TTL = 300

XP_BY_STARS = {1: 10, 2: 25, 3: 50}

LEVELS = [
    (0,    1, 'Сборщик щепы',       3),
    (50,   2, 'Сортировщик пород',  5),
    (200,  3, 'Шлифовщик',          7),
    (450,  4, 'Столяр на опыте',    10),
    (800,  5, 'Хранитель секретов', 12),
    (1000, 6, 'Резчик по легендам', 15),
]


def get_rating(cur, reg_id):
    global _rating_cache, _rating_cache_ts
    now = time.time()
    if _rating_cache is None or (now - _rating_cache_ts) > _RATING_TTL:
        all_stats = repo.get_all_rating_stats(cur)
        sorted_by_magnets = sorted(all_stats, key=lambda x: x[1], reverse=True)
        sorted_by_value = sorted(all_stats, key=lambda x: float(x[2]), reverse=True)
        _rating_cache = {
            'all_stats': all_stats,
            'sorted_by_magnets': sorted_by_magnets,
            'sorted_by_value': sorted_by_value,
            'top_magnets': repo.get_top_by_magnets(cur),
            'top_value': repo.get_top_by_value(cur),
            'total_participants': len(all_stats),
        }
        _rating_cache_ts = now

    c = _rating_cache
    rank_magnets = next((i + 1 for i, x in enumerate(c['sorted_by_magnets']) if x[0] == reg_id), None)
    rank_value = next((i + 1 for i, x in enumerate(c['sorted_by_value']) if x[0] == reg_id), None)
    my_stats = next((x for x in c['all_stats'] if x[0] == reg_id), None)
    my_collection_value = int(my_stats[2]) if my_stats else 0

    return {
        'rank_magnets': rank_magnets,
        'rank_value': rank_value,
        'total_participants': c['total_participants'],
        'my_collection_value': my_collection_value,
        'top_magnets': c['top_magnets'],
        'top_value': c['top_value'],
    }


def check_consent(cur, reg_id):
    policy_url = repo.get_setting(cur, 'privacy_policy_url') or ''
    needs_consent = False
    policy_version = ''
    if policy_url:
        policy_version = repo.get_setting(cur, 'privacy_policy_updated_at') or policy_url
        needs_consent = not repo.has_consent(cur, reg_id)
    return {'needs_consent': needs_consent, 'policy_url': policy_url, 'policy_version': policy_version}


def calc_raccoon(magnets):
    total_xp = sum(XP_BY_STARS.get(m['stars'], 0) for m in magnets)
    current = LEVELS[0]
    for lvl in LEVELS:
        if total_xp >= lvl[0]:
            current = lvl
    nxt = next((l for l in LEVELS if l[1] > current[1]), None)

    xp_for_level = total_xp - current[0]
    xp_needed = (nxt[0] - current[0]) if nxt else 0
    unique_breeds = len(set(m['breed'] for m in magnets))
    total_slots = unique_breeds + current[3]

    return {
        'xp': total_xp,
        'level': current[1],
        'level_name': current[2],
        'xp_for_level': xp_for_level,
        'xp_needed': xp_needed,
        'empty_slots': current[3],
        'total_slots': total_slots,
        'is_max_level': nxt is None,
    }


def build_collection(cur, reg):
    reg_id = reg[0]

    all_rows = repo.get_all_magnets(cur, reg_id)
    magnets = [
        {'id': r[0], 'breed': r[1], 'stars': r[2], 'category': r[3], 'given_at': str(r[4]), 'status': r[5]}
        for r in all_rows if r[5] != 'in_transit'
    ]
    in_transit = [
        {'id': r[0], 'stars': r[2], 'category': r[3], 'given_at': str(r[4])}
        for r in all_rows if r[5] == 'in_transit'
    ]
    inactive_breeds = repo.get_inactive_breeds(cur)
    bonus_rows = repo.get_bonuses(cur, reg_id)
    bonuses = [
        {'id': r[0], 'milestone_count': r[1], 'milestone_type': r[2], 'reward': r[3], 'given_at': str(r[4])}
        for r in bonus_rows
    ]

    raccoon = calc_raccoon(magnets)
    rating = get_rating(cur, reg_id)

    return {
        'client_name': reg[1], 'phone': reg[2],
        'magnets': magnets, 'total_magnets': len(magnets),
        'unique_breeds': len(set(m['breed'] for m in magnets)),
        'in_transit': in_transit, 'total_in_transit': len(in_transit),
        'bonuses': bonuses,
        'inactive_breeds': list(inactive_breeds),
        'raccoon': raccoon,
        'rating': rating,
    }
