import repository as repo


def get_analytics(cur):
    rows = repo.get_top_clients(cur)
    top_by_count = [
        {
            'id': row[0], 'name': row[1] or '', 'phone': row[2] or '',
            'magnet_count': int(row[3]), 'collection_value': int(row[4] or 0),
            'star1': int(row[5]), 'star2': int(row[6]), 'star3': int(row[7]),
        }
        for row in rows
    ]
    top_by_value = sorted(top_by_count, key=lambda x: (-x['collection_value'], -x['magnet_count']))[:20]

    dist_rows = repo.get_stars_distribution(cur)
    distribution = {str(row[0]): int(row[1]) for row in dist_rows}
    total_given = sum(distribution.values())

    return {
        'top_by_count': top_by_count,
        'top_by_value': top_by_value,
        'distribution': distribution,
        'total_given': total_given,
    }
