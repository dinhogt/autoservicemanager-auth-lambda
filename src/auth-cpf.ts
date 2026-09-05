import { isValidCpfCnpj, onlyDigits } from '@autoservicemanager/domain-shared';
import type { FindClienteByCpf } from './db';
import { signClienteJwt } from './jwt';
import type { AuthCpfSuccess, JwtSigningConfig } from './types';

export type AuthCpfDeps = {
  findClienteByCpf: FindClienteByCpf;
  jwtConfig: JwtSigningConfig;
};

export type AuthCpfResult =
  | { ok: true; body: AuthCpfSuccess }
  | { ok: false; statusCode: number; message: string };

/**
 * Autentica cliente por CPF e emite JWT RS256 (ADR-007).
 */
export async function authenticateCpf(
  rawCpf: unknown,
  deps: AuthCpfDeps,
): Promise<AuthCpfResult> {
  if (typeof rawCpf !== 'string' || !rawCpf.trim()) {
    return { ok: false, statusCode: 400, message: 'cpf é obrigatório' };
  }

  const cpf = onlyDigits(rawCpf);
  if (!isValidCpfCnpj(cpf)) {
    return { ok: false, statusCode: 400, message: 'cpf inválido' };
  }

  const cliente = await deps.findClienteByCpf(cpf);
  if (!cliente || !cliente.ativo) {
    // Resposta genérica evita enumeração de CPF
    return { ok: false, statusCode: 401, message: 'Credenciais inválidas' };
  }

  const { token, expiresAt } = signClienteJwt(cpf, deps.jwtConfig);

  return {
    ok: true,
    body: {
      token,
      tokenType: 'Bearer',
      expiresIn: deps.jwtConfig.expiresInSeconds,
      expiresAt: expiresAt.toISOString(),
    },
  };
}
