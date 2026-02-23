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
NOTES_KEY = 'breed-notes/_index.json'


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


def read_notes(client):
    try:
        resp = client.get_object(Bucket=BUCKET, Key=NOTES_KEY)
        return json.loads(resp['Body'].read().decode('utf-8'))
    except ClientError:
        return {}


def write_notes(client, notes):
    client.put_object(
        Bucket=BUCKET,
        Key=NOTES_KEY,
        Body=json.dumps(notes, ensure_ascii=False).encode('utf-8'),
        ContentType='application/json',
    )


def handler(event, context):
    """
    GET — все заметки пород. POST {breed, text} — сохранить заметку. DELETE ?breed= — удалить.
    """
    if event.get('httpMethod') == 'OPTIONS':
        return OPTIONS_RESPONSE

    method = event.get('httpMethod')
    client = s3_client()

    if method == 'GET':
        notes = read_notes(client)
        return ok({'notes': notes})

    if method == 'POST':
        raw_body = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            raw_body = base64.b64decode(raw_body).decode('utf-8')
        body = json.loads(raw_body)
        breed = (body.get('breed') or '').strip()
        text = (body.get('text') or '').strip()

        if not breed:
            return err('breed обязателен')

        notes = read_notes(client)
        if text:
            notes[breed] = text
        else:
            notes.pop(breed, None)
        write_notes(client, notes)

        return ok({'saved': 1, 'breed': breed})

    if method == 'DELETE':
        params = event.get('queryStringParameters') or {}
        breed = (params.get('breed') or '').strip()
        if not breed:
            return err('breed обязателен')

        notes = read_notes(client)
        existed = breed in notes
        notes.pop(breed, None)
        write_notes(client, notes)

        return ok({'deleted': 1 if existed else 0})

    return err('Method not allowed', 405)
