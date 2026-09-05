import { generateKeyPairSync } from 'node:crypto';
import { authenticateCpf } from './auth-cpf';
import type { JwtSigningConfig } from './types';

function testJwtConfig(): JwtSigningConfig {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return {
    privateKeyPem: privateKey,
    kid: 'test-1',
    issuer: 'test-iss',
    audience: 'test-aud',
    expiresInSeconds: 3600,
  };
}

describe('authenticateCpf', () => {
  const jwtConfig = testJwtConfig();

  it('rejeita cpf ausente', async () => {
    const result = await authenticateCpf(undefined, {
      findClienteByCpf: jest.fn(),
      jwtConfig,
    });
    expect(result).toEqual({
      ok: false,
      statusCode: 400,
      message: 'cpf é obrigatório',
    });
  });

  it('rejeita cpf inválido', async () => {
    const result = await authenticateCpf('11111111111', {
      findClienteByCpf: jest.fn(),
      jwtConfig,
    });
    expect(result).toMatchObject({ ok: false, statusCode: 400 });
  });

  it('rejeita cliente inexistente sem enumerar', async () => {
    const find = jest.fn().mockResolvedValue(null);
    const result = await authenticateCpf('52998224725', {
      findClienteByCpf: find,
      jwtConfig,
    });
    expect(find).toHaveBeenCalledWith('52998224725');
    expect(result).toEqual({
      ok: false,
      statusCode: 401,
      message: 'Credenciais inválidas',
    });
  });

  it('rejeita cliente inativo', async () => {
    const result = await authenticateCpf('52998224725', {
      findClienteByCpf: jest.fn().mockResolvedValue({
        id: 'c1',
        cpfCnpj: '52998224725',
        ativo: false,
      }),
      jwtConfig,
    });
    expect(result).toMatchObject({ ok: false, statusCode: 401 });
  });

  it('emite JWT RS256 para cliente ativo', async () => {
    const result = await authenticateCpf('529.982.247-25', {
      findClienteByCpf: jest.fn().mockResolvedValue({
        id: 'c1',
        cpfCnpj: '52998224725',
        ativo: true,
      }),
      jwtConfig,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.tokenType).toBe('Bearer');
    expect(result.body.token.split('.')).toHaveLength(3);
    expect(result.body.expiresIn).toBe(3600);
  });
});
