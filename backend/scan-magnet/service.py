import repository as repo

WELCOME_BREED = 'Падук'


def scan(cur, conn, reg, breed):
    magnet_row = repo.get_magnet_by_breed(cur, reg[0], breed)

    if not magnet_row:
        breed_known = repo.breed_is_active(cur, breed)
        return {
            'result': 'not_in_collection',
            'breed': breed,
            'breed_known': breed_known,
            'client_name': reg[1],
        }

    magnet_id, current_status, magnet_stars, magnet_category = magnet_row

    if current_status == 'in_transit':
        repo.reveal_magnet(cur, magnet_id)
        conn.commit()
        return {
            'result': 'revealed',
            'breed': breed,
            'stars': magnet_stars,
            'category': magnet_category,
            'client_name': reg[1],
            'magnet_id': magnet_id,
            'is_welcome': breed == WELCOME_BREED,
        }

    return {
        'result': 'already_revealed',
        'breed': breed,
        'stars': magnet_stars,
        'category': magnet_category,
        'client_name': reg[1],
        'magnet_id': magnet_id,
    }
