import os
import json
import requests


def handler(event: dict, context) -> dict:
    """Проксирует запрос на отправку кода верификации в i-dgtl"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    key = body.get('key')

    if not key:
        return {'statusCode': 400, 'headers': {'Access-Control-Allow-Origin': '*'}, 'body': json.dumps({'error': 'key обязателен'})}

    api_key = os.environ['IDGTL_API_KEY']
    resp = requests.post(
        'https://direct.i-dgtl.ru/api/v1/verifier/widget/send',
        headers={
            'Authorization': f'Basic {api_key}',
            'Content-Type': 'application/json',
        },
        json={'key': key},
        timeout=10,
    )

    return {
        'statusCode': resp.status_code,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': resp.text,
    }
