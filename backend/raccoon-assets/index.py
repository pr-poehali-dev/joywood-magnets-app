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
    POST action=multipart_start — начать multipart upload видео, вернуть upload_id.
    POST action=multipart_chunk — загрузить чанк видео (base64), вернуть ETag.
    POST action=multipart_complete — завершить multipart upload, обновить индекс.
    POST action=multipart_abort — отменить multipart upload.
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

        # --- Загрузка фото (base64) ---
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

        # --- Начало multipart upload ---
        if action == 'multipart_start':
            key = f'raccoon/level-{level}-video.mp4'
            try:
                resp = s3.create_multipart_upload(Bucket=BUCKET, Key=key, ContentType='video/mp4')
                upload_id = resp['UploadId']
                print(f"[multipart_start] OK upload_id={upload_id}")
            except Exception as e:
                print(f"[multipart_start] FAIL: {e}")
                return {'statusCode': 500, 'headers': {**CORS, 'Content-Type': 'application/json'},
                        'body': json.dumps({'ok': False, 'error': str(e)})}
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': True, 'upload_id': upload_id, 'key': key})}

        # --- Загрузка одного чанка ---
        if action == 'multipart_chunk':
            upload_id = body.get('upload_id')
            part_number = body.get('part_number')
            data_b64 = body.get('data')
            key = f'raccoon/level-{level}-video.mp4'
            if not upload_id or not part_number or not data_b64:
                return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                        'body': json.dumps({'error': 'upload_id, part_number, data обязательны'})}
            if ',' in data_b64:
                data_b64 = data_b64.split(',', 1)[1]
            chunk_bytes = base64.b64decode(data_b64)
            try:
                resp = s3.upload_part(
                    Bucket=BUCKET, Key=key,
                    UploadId=upload_id,
                    PartNumber=int(part_number),
                    Body=chunk_bytes,
                )
                etag = resp['ETag']
                print(f"[multipart_chunk] part={part_number} etag={etag}")
            except Exception as e:
                print(f"[multipart_chunk] FAIL part={part_number}: {e}")
                return {'statusCode': 500, 'headers': {**CORS, 'Content-Type': 'application/json'},
                        'body': json.dumps({'ok': False, 'error': str(e)})}
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': True, 'etag': etag})}

        # --- Завершение multipart upload ---
        if action == 'multipart_complete':
            upload_id = body.get('upload_id')
            parts = body.get('parts')
            key = f'raccoon/level-{level}-video.mp4'
            if not upload_id or not parts:
                return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'},
                        'body': json.dumps({'error': 'upload_id, parts обязательны'})}
            try:
                s3.complete_multipart_upload(
                    Bucket=BUCKET, Key=key, UploadId=upload_id,
                    MultipartUpload={'Parts': [{'PartNumber': p['part_number'], 'ETag': p['etag']} for p in parts]},
                )
                print(f"[multipart_complete] OK key={key}")
            except Exception as e:
                print(f"[multipart_complete] FAIL: {e}")
                return {'statusCode': 500, 'headers': {**CORS, 'Content-Type': 'application/json'},
                        'body': json.dumps({'ok': False, 'error': str(e)})}
            url = cdn(key)
            index = load_index(s3)
            level_key = str(level)
            if level_key not in index:
                index[level_key] = {}
            index[level_key]['video'] = url
            save_index(s3, index)
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': True, 'url': url})}

        # --- Отмена multipart upload ---
        if action == 'multipart_abort':
            upload_id = body.get('upload_id')
            key = f'raccoon/level-{level}-video.mp4'
            if upload_id:
                try:
                    s3.abort_multipart_upload(Bucket=BUCKET, Key=key, UploadId=upload_id)
                except Exception as e:
                    print(f"[multipart_abort] FAIL: {e}")
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'},
                    'body': json.dumps({'ok': True})}

    return {'statusCode': 405, 'headers': CORS, 'body': ''}