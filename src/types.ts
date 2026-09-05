export type AuthCpfRequest = {
  cpf: string;
};

export type AuthCpfSuccess = {
  token: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
};

export type ClienteRow = {
  id: string;
  cpfCnpj: string;
  ativo: boolean;
};

export type JwtSigningConfig = {
  privateKeyPem: string;
  kid: string;
  issuer: string;
  audience: string;
  expiresInSeconds: number;
};

export type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};
