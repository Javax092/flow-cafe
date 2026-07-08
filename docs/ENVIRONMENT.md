# Ambiente

## Arquivos de ambiente

### `.env.example`

Arquivo versionado com nomes de variaveis e valores locais ficticios. Serve como contrato publico de configuracao. Nao deve conter credenciais reais.

### `.env.local`

Arquivo local do desenvolvedor. Deve ser criado a partir do exemplo:

```bash
cp .env.example .env.local
```

Use nele a URL real do banco local e credenciais locais de seed. Nao versionar.

### Producao

Variaveis devem ser configuradas no provedor de deploy ou secret manager. Nunca copiar valores de producao para `.env.example`, README ou documentos de sprint.

## Variaveis

| Variavel | Obrigatoria | Uso |
| --- | --- | --- |
| `DATABASE_URL` | Sim | URL PostgreSQL usada por Prisma, migrations e seed. |
| `SEED_OWNER_EMAIL` | Nao | E-mail do usuario `OWNER` criado ou atualizado pelo seed local. |
| `SEED_OWNER_PASSWORD` | Nao | Senha local do usuario `OWNER` do seed. |
| `PRINT_WEBHOOK_URL` | Nao | Endpoint HTTP do agente local de impressao. String vazia desativa. |
| `NODE_ENV` | Runtime | Controla comportamento de desenvolvimento, teste ou producao. |

`src/config/env.ts` valida `DATABASE_URL`, `NODE_ENV` e `PRINT_WEBHOOK_URL` para uso server-side. As variaveis de seed sao lidas diretamente por `prisma/seed.mjs`.

## Regras para segredos

- Nao commitar `.env`, `.env.local` ou credenciais reais.
- Nao registrar senha, token de sessao ou URL de producao em logs.
- Usar valores ficticios em documentacao.
- Rotacionar qualquer segredo que tenha sido exposto acidentalmente.
- Em producao, usar credenciais diferentes das locais.

## Prisma

Comandos comuns:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

Para criar migrations em desenvolvimento, use o fluxo Prisma apropriado ao ambiente local. Antes de aceitar uma sprint com alteracao de schema, valide:

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run build
```

## Prisma 7 e PostgreSQL adapter

O projeto usa Prisma `7.8.0`. Com Prisma 7, a configuracao do datasource esta em `prisma.config.ts`, e o Prisma Client em runtime usa driver adapter:

- dependencia `@prisma/adapter-pg`;
- dependencia `pg`;
- instancia em `src/server/db/prisma.ts` com `new PrismaPg({ connectionString: env.DATABASE_URL })`.

Se o adapter for removido ou `DATABASE_URL` estiver ausente, o build ou a execucao server-side pode falhar.
