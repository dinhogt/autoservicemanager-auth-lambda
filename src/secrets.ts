import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import type { DbConfig, JwtSigningConfig } from './types';

const sm = new SecretsManagerClient({});

let cachedDb: DbConfig | undefined;
let cachedJwt: { privateKeyPem: string; kid: string } | undefined;

export async function loadDbConfig(): Promise<DbConfig> {
  if (cachedDb) {
    return cachedDb;
  }

  const url = process.env.DATABASE_URL;
  if (url) {
    cachedDb = parseMysqlUrl(url);
    return cachedDb;
  }

  const arn = process.env.DB_SECRET_ARN;
  if (!arn) {
    throw new Error('DB_SECRET_ARN ou DATABASE_URL é obrigatório');
  }

  const raw = await getSecretString(arn);
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  cachedDb = {
    host: String(parsed.host ?? parsed.hostname),
    port: Number(parsed.port ?? 3306),
    user: String(parsed.username ?? parsed.user),
    password: String(parsed.password),
    database: String(parsed.dbname ?? parsed.database),
  };
  return cachedDb;
}

export async function loadJwtSigningMaterial(): Promise<
  Pick<JwtSigningConfig, 'privateKeyPem' | 'kid'>
> {
  if (cachedJwt) {
    return cachedJwt;
  }

  const pemFromEnv = process.env.JWT_PRIVATE_KEY_PEM;
  if (pemFromEnv) {
    cachedJwt = {
      privateKeyPem: normalizePem(pemFromEnv),
      kid: process.env.JWT_KID ?? 'auth-cpf-1',
    };
    return cachedJwt;
  }

  const arn = process.env.JWT_PRIVATE_KEY_ARN;
  if (!arn) {
    throw new Error('JWT_PRIVATE_KEY_ARN ou JWT_PRIVATE_KEY_PEM é obrigatório');
  }

  const raw = await getSecretString(arn);
  // Secret pode ser PEM puro ou JSON { privateKey, kid }
  if (raw.trim().startsWith('{')) {
    const parsed = JSON.parse(raw) as { privateKey?: string; kid?: string };
    if (!parsed.privateKey) {
      throw new Error('Segredo JWT sem campo privateKey');
    }
    cachedJwt = {
      privateKeyPem: normalizePem(parsed.privateKey),
      kid: parsed.kid ?? process.env.JWT_KID ?? 'auth-cpf-1',
    };
  } else {
    cachedJwt = {
      privateKeyPem: normalizePem(raw),
      kid: process.env.JWT_KID ?? 'auth-cpf-1',
    };
  }
  return cachedJwt;
}

export function clearSecretsCache(): void {
  cachedDb = undefined;
  cachedJwt = undefined;
}

async function getSecretString(secretId: string): Promise<string> {
  const out = await sm.send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );
  if (out.SecretString) {
    return out.SecretString;
  }
  if (out.SecretBinary) {
    return Buffer.from(out.SecretBinary).toString('utf8');
  }
  throw new Error(`Segredo vazio: ${secretId}`);
}

function normalizePem(value: string): string {
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}

/** mysql://user:pass@host:3306/db */
export function parseMysqlUrl(url: string): DbConfig {
  const u = new URL(url);
  if (u.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL deve usar scheme mysql://');
  }
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
}
