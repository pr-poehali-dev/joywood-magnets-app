import os
import json
import base64
import boto3
import psycopg2
from datetime import datetime

SCHEMA = 't_p65563100_joywood_magnets_app'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """Загрузка PDF политики конфиденциальности в S3 и сохранение URL в настройках"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**CORS, 'Access-Control-Max-Age': '86400'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    file_b64 = body.get('file')
    filename = body.get('filename', 'privacy-policy.pdf')

    if not file_b64:
        return {'statusCode': 400, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': 'file обязателен'})}

    file_data = base64.b64decode(file_b64)

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    key = f'docs/{filename}'
    s3.put_object(Bucket='files', Key=key, Body=file_data, ContentType='application/pdf')

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    policy_version = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"INSERT INTO {SCHEMA}.settings (key, value, updated_at) VALUES ('privacy_policy_url', %s, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
        (cdn_url,),
    )
    cur.execute(
        f"INSERT INTO {SCHEMA}.settings (key, value, updated_at) VALUES ('privacy_policy_updated_at', %s, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
        (policy_version,),
    )
    conn.commit()
    conn.close()

    return {
        'statusCode': 200,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True, 'url': cdn_url, 'version': policy_version}),
    }