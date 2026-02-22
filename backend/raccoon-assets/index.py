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
    """Управление фото и видео уровней Енота-мастера.
    GET — индекс.
    POST action=upload_photo — загрузка фото (base64).
    POST action=presign_video — получить presigned URL для прямой загрузки видео в S3.
    POST action=confirm_video — подтвердить загрузку видео, обновить индекс.
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    s3 = s3_client()

    if event.get('httpMethod') == 'GET':
        index = load_index(s3)
        return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(index)}

    if event.get('httpMethod') == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action', 'upload_photo')
        level = body.get('level')

        if not level:
            return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'error': 'level обязателен'})}

        # --- Загрузка фото (base64, маленький размер) ---
        if action == 'upload_photo':
            data_b64 = body.get('data')
            if not data_b64:
                return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                        'body': json.dumps({'error': 'data обязателен'})}
            if ',' in data_b64:
                data_b64 = data_b64.split(',', 1)[1]
            file_bytes = base64.b64decode(data_b64)
            ext = body.get('ext', 'jpg')
            key = f'raccoon/level-{level}-photo.{ext}'
            content_type = 'image/jpeg' if ext in ('jpg', 'jpeg') else f'image/{ext}'
            s3.put_object(Bucket=BUCKET, Key=key, Body=file_bytes, ContentType=content_type)
            url = cdn(key)
            index = load_index(s3)
            level_key = str(level)
            if level_key not in index:
                index[level_key] = {}
            index[level_key]['photo'] = url
            save_index(s3, index)
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': True, 'url': url})}

        # --- Presigned URL для загрузки видео напрямую в S3 ---
        if action == 'presign_video':
            key = f'raccoon/level-{level}-video.mp4'
            presigned = s3.generate_presigned_url(
                'put_object',
                Params={'Bucket': BUCKET, 'Key': key, 'ContentType': 'video/mp4'},
                ExpiresIn=600,
            )
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': True, 'upload_url': presigned, 'key': key})}

        # --- Подтверждение видео после прямой загрузки ---
        if action == 'confirm_video':
            key = f'raccoon/level-{level}-video.mp4'
            url = cdn(key)
            index = load_index(s3)
            level_key = str(level)
            if level_key not in index:
                index[level_key] = {}
            index[level_key]['video'] = url
            save_index(s3, index)
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': True, 'url': url})}

    return {'statusCode': 405, 'headers': CORS, 'body': ''}