import jwt from 'jsonwebtoken';
import type { JwtSigningConfig } from './types';

export function signClienteJwt(
  cpfDigits: string,
  config: JwtSigningConfig,
): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + config.expiresInSeconds * 1000);

  const token = jwt.sign(
    { scope: 'cliente' },
    config.privateKeyPem,
    {
      algorithm: 'RS256',
      keyid: config.kid,
      subject: cpfDigits,
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: config.expiresInSeconds,
    },
  );

  return { token, expiresAt };
}
