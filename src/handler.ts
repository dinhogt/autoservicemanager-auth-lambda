import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { authenticateCpf } from './auth-cpf';
import { createFindClienteByCpf } from './db';
import { loadDbConfig, loadJwtSigningMaterial } from './secrets';

const CORS_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': process.env.CORS_ORIGIN ?? '*',
  'access-control-allow-headers': 'content-type,authorization',
};

function json(
  statusCode: number,
  body: unknown,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> {
  if (!event.body) {
    return {};
  }
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * POST /auth/cpf — API Gateway HTTP API (payload 2.0).
 */
export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const method = event.requestContext?.http?.method ?? 'POST';
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (method !== 'POST') {
    return json(405, { message: 'Method Not Allowed' });
  }

  try {
    const body = parseBody(event);
    const db = await loadDbConfig();
    const signing = await loadJwtSigningMaterial();

    const result = await authenticateCpf(body.cpf, {
      findClienteByCpf: createFindClienteByCpf(db),
      jwtConfig: {
        privateKeyPem: signing.privateKeyPem,
        kid: signing.kid,
        issuer: process.env.JWT_ISS ?? 'autoservicemanager',
        audience: process.env.JWT_AUD ?? 'autoservicemanager-api',
        expiresInSeconds: Number(process.env.JWT_EXPIRES_IN ?? 3600),
      },
    });

    if (!result.ok) {
      return json(result.statusCode, { message: result.message });
    }
    return json(200, result.body);
  } catch (err) {
    console.error('authCpf error', {
      message: err instanceof Error ? err.message : String(err),
    });
    return json(500, { message: 'Erro interno' });
  }
}
