import os
import json
import base64
import boto3
import urllib.request

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

BUCKET = 'files'
INDEX_KEY = 'raccoon/index.json'


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def cdn(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def load_index(s3) -> dict:
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=INDEX_KEY)
        return json.loads(obj['Body'].read())
    except Exception:
        return {}


def save_index(s3, index: dict):
    s3.put_object(
        Bucket=BUCKET, Key=INDEX_KEY,
        Body=json.dumps(index, ensure_ascii=False).encode(),
        ContentType='application/json',
    )


def handler(event: dict, context) -> dict:
    """Загрузка видео в S3.
    POST action=upload_raccoon_chunk: накапливает чанк base64 во временном файле /tmp/raccoon_video_{level}_{chunk}.
    POST action=upload_raccoon_finish: собирает все чанки, кладёт в S3, обновляет индекс.
    POST (без action): скачивает видео по URL (старый режим).
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    # --- Старый режим: скачать по URL ---
    if not action:
        source_url = body.get('url')
        filename = body.get('filename', 'promo-bg.mp4')
        if not source_url:
            return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'url обязателен'})}
        req = urllib.request.Request(source_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as resp:
            video_data = resp.read()
        s3 = s3_client()
        key = f'videos/{filename}'
        s3.put_object(Bucket=BUCKET, Key=key, Body=video_data, ContentType='video/mp4')
        return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({'ok': True, 'url': cdn(key)})}

    # --- Загрузка чанка во временный файл ---
    if action == 'upload_raccoon_chunk':
        level = body.get('level')
        chunk_index = body.get('chunk_index')
        total_chunks = body.get('total_chunks')
        data_b64 = body.get('data', '')
        if not level or chunk_index is None or not data_b64:
            return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'level, chunk_index, data обязательны'})}
        if ',' in data_b64:
            data_b64 = data_b64.split(',', 1)[1]
        chunk_bytes = base64.b64decode(data_b64)
        tmp_path = f'/tmp/raccoon_{level}_{chunk_index}.bin'
        with open(tmp_path, 'wb') as f:
            f.write(chunk_bytes)
        print(f"[chunk] level={level} idx={chunk_index}/{total_chunks} size={len(chunk_bytes)}")
        return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({'ok': True})}

    # --- Сборка и загрузка в S3 ---
    if action == 'upload_raccoon_finish':
        level = body.get('level')
        total_chunks = body.get('total_chunks')
        if not level or not total_chunks:
            return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'level, total_chunks обязательны'})}
        # Собираем все чанки
        video_bytes = b''
        for i in range(int(total_chunks)):
            tmp_path = f'/tmp/raccoon_{level}_{i}.bin'
            try:
                with open(tmp_path, 'rb') as f:
                    video_bytes += f.read()
            except FileNotFoundError:
                print(f"[finish] MISSING chunk {i}")
                return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                        'body': json.dumps({'error': f'Чанк {i} не найден — загрузите заново'})}
        print(f"[finish] level={level} total_size={len(video_bytes)}")
        key = f'raccoon/level-{level}-video.mp4'
        s3 = s3_client()
        s3.put_object(Bucket=BUCKET, Key=key, Body=video_bytes, ContentType='video/mp4')
        url = cdn(key)
        index = load_index(s3)
        level_key = str(level)
        if level_key not in index:
            index[level_key] = {}
        index[level_key]['video'] = url
        save_index(s3, index)
        # Чистим tmp
        for i in range(int(total_chunks)):
            try:
                os.remove(f'/tmp/raccoon_{level}_{i}.bin')
            except Exception:
                pass
        return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({'ok': True, 'url': url})}

    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Unknown action'})}