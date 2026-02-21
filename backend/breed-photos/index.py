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
        resp_all = client.list_objects_v2(Bucket=BUCKET)
        all_keys = [o['Key'] for o in resp_all.get('Contents', [])]
        print(f"GET all_keys={all_keys}")
        photos = {}
        for key in all_keys:
            if not key.startswith(PREFIX):
                continue
            filename = key[len(PREFIX):]
            if not filename:
                continue
            breed = filename.rsplit('.', 1)[0]
            photos[breed] = cdn_base + filename
        return ok({'photos': photos, 'all_keys': all_keys})

    if method == 'POST':
        raw_body = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            raw_body = base64.b64decode(raw_body).decode('utf-8')
        body = json.loads(raw_body)
        breed = (body.get('breed') or '').strip()
        data_url = (body.get('image') or '').strip()

        print(f"POST breed={repr(breed)} image_len={len(data_url)} isBase64={event.get('isBase64Encoded')}")

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
        print(f"Saving to S3 key={repr(key)} size={len(image_bytes)}")
        client = s3()

        for obj in client.list_objects_v2(Bucket=BUCKET, Prefix=f"{PREFIX}{breed}.").get('Contents', []):
            client.delete_object(Bucket=BUCKET, Key=obj['Key'])

        client.put_object(Bucket=BUCKET, Key=key, Body=image_bytes, ContentType=content_type)
        print(f"Saved OK key={repr(key)}")

        buckets = [b['Name'] for b in client.list_buckets().get('Buckets', [])]
        print(f"Available buckets: {buckets}")
        verify = client.list_objects_v2(Bucket=BUCKET)
        found_keys = [o['Key'] for o in verify.get('Contents', [])]
        print(f"Verify after PUT all_keys={found_keys}")

        url = f"https://cdn.poehali.dev/projects/{key_id}/bucket/{key}"
        return ok({'url': url, 'breed': breed, 'debug_buckets': buckets, 'debug_found': found_keys})

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