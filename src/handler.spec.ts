import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { generateKeyPairSync } from 'node:crypto';

jest.mock('./secrets', () => ({
  loadDbConfig: jest.fn().mockResolvedValue({
    host: 'localhost',
    port: 3306,
    user: 'app',
    password: 'x',
    database: 'autoservicemanager',
  }),
  loadJwtSigningMaterial: jest.fn(),
}));

jest.mock('./db', () => ({
  createFindClienteByCpf: jest.fn(),
}));

import { handler } from './handler';
import { createFindClienteByCpf } from './db';
import { loadJwtSigningMaterial } from './secrets';

function event(
  overrides: Partial<APIGatewayProxyEventV2> & {
    body?: string;
    method?: string;
  } = {},
): APIGatewayProxyEventV2 {
  const method = overrides.method ?? 'POST';
  return {
    version: '2.0',
    routeKey: 'POST /auth/cpf',
    rawPath: '/auth/cpf',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: '1',
      apiId: 'api',
      domainName: 'example.com',
      domainPrefix: 'example',
      http: {
        method,
        path: '/auth/cpf',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'jest',
      },
      requestId: 'req',
      routeKey: 'POST /auth/cpf',
      stage: '$default',
      time: '08/Aug/2026:00:00:00 +0000',
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
    body: overrides.body,
    ...overrides,
  } as APIGatewayProxyEventV2;
}

describe('handler', () => {
  beforeAll(() => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    (loadJwtSigningMaterial as jest.Mock).mockResolvedValue({
      privateKeyPem: privateKey,
      kid: 'test-1',
    });
  });

  beforeEach(() => {
    (createFindClienteByCpf as jest.Mock).mockReturnValue(
      jest.fn().mockResolvedValue({
        id: 'c1',
        cpfCnpj: '52998224725',
        ativo: true,
      }),
    );
  });

  it('OPTIONS retorna 204', async () => {
    const res = await handler(event({ method: 'OPTIONS' }));
    expect(res.statusCode).toBe(204);
  });

  it('GET retorna 405', async () => {
    const res = await handler(event({ method: 'GET' }));
    expect(res.statusCode).toBe(405);
  });

  it('POST válido retorna token', async () => {
    const res = await handler(
      event({ body: JSON.stringify({ cpf: '52998224725' }) }),
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body ?? '{}') as { token?: string };
    expect(body.token).toBeTruthy();
  });

  it('POST com cpf inválido retorna 400', async () => {
    const res = await handler(
      event({ body: JSON.stringify({ cpf: '000' }) }),
    );
    expect(res.statusCode).toBe(400);
  });
});
