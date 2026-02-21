import json
import os
import base64
import boto3

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}
CORS = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
OPTIONS_RESPONSE = {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

BUCKET = 'files'
PREFIX = 'breed-photos/'


def ok(data):
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False)}


def err(msg, status=400):
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps({'error': msg}, ensure_ascii=False)}


def s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def handler(event, context):
    """GET — список загруженных фото пород. POST — загрузить фото породы. DELETE — удалить фото."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    method = event.get('httpMethod')
    key_id = os.environ['AWS_ACCESS_KEY_ID']
    cdn_base = f"https://cdn.poehali.dev/projects/{key_id}/bucket/{PREFIX}"

    if method == 'GET':
        client = s3()
        resp = client.list_objects_v2(Bucket=BUCKET, Prefix=PREFIX)
        photos = {}
        for obj in resp.get('Contents', []):
            key = obj['Key']
            filename = key[len(PREFIX):]
            breed = filename.rsplit('.', 1)[0]
            photos[breed] = cdn_base + filename
        return ok({'photos': photos})

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        breed = (body.get('breed') or '').strip()
        data_url = (body.get('image') or '').strip()

        if not breed or not data_url:
            return err('breed и image обязательны')

        if ',' in data_url:
            header, b64 = data_url.split(',', 1)
            content_type = header.split(':')[1].split(';')[0] if ':' in header else 'image/jpeg'
        else:
            b64 = data_url
            content_type = 'image/jpeg'

        ext = 'jpg' if 'jpeg' in content_type or 'jpg' in content_type else content_type.split('/')[-1]
        image_bytes = base64.b64decode(b64)

        key = f"{PREFIX}{breed}.{ext}"
        client = s3()

        for obj in client.list_objects_v2(Bucket=BUCKET, Prefix=f"{PREFIX}{breed}.").get('Contents', []):
            client.delete_object(Bucket=BUCKET, Key=obj['Key'])

        client.put_object(Bucket=BUCKET, Key=key, Body=image_bytes, ContentType=content_type)
        url = f"https://cdn.poehali.dev/projects/{key_id}/bucket/{key}"
        return ok({'url': url, 'breed': breed})

    if method == 'DELETE':
        params = event.get('queryStringParameters') or {}
        breed = (params.get('breed') or '').strip()
        if not breed:
            return err('breed обязателен')

        client = s3()
        deleted = 0
        for obj in client.list_objects_v2(Bucket=BUCKET, Prefix=f"{PREFIX}{breed}.").get('Contents', []):
            client.delete_object(Bucket=BUCKET, Key=obj['Key'])
            deleted += 1
        return ok({'deleted': deleted})

    return err('Method not allowed', 405)
