import os
import json
import base64
import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}
INDEX_KEY = 'raccoon/index.json'
BUCKET = 'files'


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
    """Управление фото и видео уровней Енота-мастера (GET — индекс, POST — загрузка)"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    s3 = s3_client()

    if event.get('httpMethod') == 'GET':
        index = load_index(s3)
        return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(index)}

    if event.get('httpMethod') == 'POST':
        body = json.loads(event.get('body') or '{}')
        level = body.get('level')
        asset_type = body.get('type')  # 'photo' or 'video'
        data_b64 = body.get('data')    # base64-encoded file

        if not level or asset_type not in ('photo', 'video') or not data_b64:
            return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'level, type (photo|video) и data обязательны'})}

        # Убираем data URI префикс если есть
        if ',' in data_b64:
            data_b64 = data_b64.split(',', 1)[1]
        file_bytes = base64.b64decode(data_b64)

        if asset_type == 'photo':
            ext = body.get('ext', 'jpg')
            key = f'raccoon/level-{level}-photo.{ext}'
            content_type = f'image/{ext}' if ext != 'jpg' else 'image/jpeg'
        else:
            key = f'raccoon/level-{level}-video.mp4'
            content_type = 'video/mp4'

        s3.put_object(Bucket=BUCKET, Key=key, Body=file_bytes, ContentType=content_type)

        index = load_index(s3)
        level_key = str(level)
        if level_key not in index:
            index[level_key] = {}
        index[level_key][asset_type] = cdn(key)
        save_index(s3, index)

        return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                'body': json.dumps({'ok': True, 'url': cdn(key)})}

    return {'statusCode': 405, 'headers': CORS, 'body': ''}
