import json
import os
import base64
import boto3
from botocore.exceptions import ClientError

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
INDEX_KEY = 'breed-photos/_index.json'


def ok(data):
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False)}


def err(msg, status=400):
    return {'statusCode': status, 'headers': CORS, 'body': json.dumps({'error': msg}, ensure_ascii=False)}


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def read_index(client):
    try:
        resp = client.get_object(Bucket=BUCKET, Key=INDEX_KEY)
        return json.loads(resp['Body'].read().decode('utf-8'))
    except ClientError:
        return {}


def write_index(client, index):
    client.put_object(
        Bucket=BUCKET,
        Key=INDEX_KEY,
        Body=json.dumps(index, ensure_ascii=False).encode('utf-8'),
        ContentType='application/json',
    )


def handler(event, context):
    """GET — список фото пород. POST — загрузить фото. DELETE — удалить фото."""
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    method = event.get('httpMethod')
    key_id = os.environ['AWS_ACCESS_KEY_ID']
    cdn_base = f"https://cdn.poehali.dev/projects/{key_id}/bucket/{PREFIX}"
    client = s3_client()

    if method == 'GET':
        index = read_index(client)
        photos = {breed: cdn_base + filename for breed, filename in index.items()}
        return ok({'photos': photos})

    if method == 'POST':
        raw_body = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            raw_body = base64.b64decode(raw_body).decode('utf-8')
        body = json.loads(raw_body)
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

        safe_name = breed.replace('/', '_').replace('\\', '_')
        filename = f"{safe_name}.{ext}"
        key = f"{PREFIX}{filename}"

        client.put_object(Bucket=BUCKET, Key=key, Body=image_bytes, ContentType=content_type)

        index = read_index(client)
        index[breed] = filename
        write_index(client, index)

        url = f"https://cdn.poehali.dev/projects/{key_id}/bucket/{key}"
        return ok({'url': url, 'breed': breed})

    if method == 'DELETE':
        params = event.get('queryStringParameters') or {}
        breed = (params.get('breed') or '').strip()
        if not breed:
            return err('breed обязателен')

        index = read_index(client)
        filename = index.get(breed)
        if filename:
            try:
                client.delete_object(Bucket=BUCKET, Key=f"{PREFIX}{filename}")
            except ClientError:
                pass
            del index[breed]
            write_index(client, index)

        return ok({'deleted': 1 if filename else 0})

    return err('Method not allowed', 405)
