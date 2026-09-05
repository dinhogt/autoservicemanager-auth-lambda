# autoservicemanager-auth-lambda

Lambda **authCpf** (Node 22): autentica cliente por CPF no RDS MySQL e emite **JWT RS256** (ADR-007).

Este diretório vive no monorepo até a cisão do repo GitHub `autoservicemanager-auth-lambda`.

**Docs:** [RFC-003](../docs/architecture/rfc-003-auth-lambda-rs256.md) · [ADR-007](../docs/architecture/adr-007-jwt-rs256-api-gateway-authorizer.md) · [diagramas](../docs/architecture/diagrams-fase3.md) · [release notes](../docs/release-notes.md)

## Contrato

`POST /auth/cpf`

```json
{ "cpf": "529.982.247-25" }
```

**200**

```json
{
  "token": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "expiresAt": "2026-08-08T12:00:00.000Z"
}
```

Claims: `sub` = CPF dígitos, `scope` = `cliente`, header `kid`, `iss`/`aud` configuráveis.

| Status | Quando |
|--------|--------|
| 400 | CPF ausente/inválido |
| 401 | Cliente inexistente ou inativo |
| 405 | Método ≠ POST |
| 500 | Falha Secrets/DB/assinatura |

## Variáveis

| Var | Obrigatório | Descrição |
|-----|-------------|-----------|
| `DB_SECRET_ARN` | * | JSON Secrets Manager (`host`,`port`,`username`,`password`,`dbname`) |
| `DATABASE_URL` | * | Alternativa local `mysql://...` (vence sobre ARN) |
| `JWT_PRIVATE_KEY_ARN` | * | PEM ou JSON `{ privateKey, kid }` |
| `JWT_PRIVATE_KEY_PEM` | * | Alternativa local (vence sobre ARN) |
| `JWT_KID` | não | default `auth-cpf-1` |
| `JWT_ISS` | não | default `autoservicemanager` |
| `JWT_AUD` | não | default `autoservicemanager-api` |
| `JWT_EXPIRES_IN` | não | segundos, default `3600` |
| `CORS_ORIGIN` | não | default `*` |

\* Um de cada par (ARN ou local) é obrigatório.

## Desenvolvimento

```bash
cd auth-lambda
yarn install
yarn test
yarn build   # → dist/handler.js (esbuild bundle)
yarn package # → auth-cpf.zip
```

Dependência local: `@autoservicemanager/domain-shared` via `file:../packages/domain-shared`. No repo separado, apontar para GitHub Packages.

## CI/CD

Workflow monorepo: `.github/workflows/auth-lambda-ci-cd.yml` (OIDC → update Lambda code). Secrets: `AWS_ROLE_ARN`, `AUTH_LAMBDA_NAME`.

## Integração

API Gateway HTTP API rota `POST /auth/cpf` → esta Lambda. JWT Authorizer usa JWKS público (gerado no todo `repo-infra-k8s`).
