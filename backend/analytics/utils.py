import json
import os
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}

CORS = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

OPTIONS_RESPONSE = {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}


def ok(data: dict) -> dict:
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])
