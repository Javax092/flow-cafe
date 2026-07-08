# Flow Cafe

Flow Cafe e um sistema web para operacao de cafeterias e pequenos restaurantes. O projeto usa Next.js, Prisma e PostgreSQL, com arquitetura server-side orientada a isolamento multiempresa por `businessId`.

## Status atual

Status oficial do roadmap:

- Sprint 0 - Fundacao Tecnica: concluida.
- Sprint 1 - Modelagem Base e Multiempresa: concluida.
- Sprint 2 - Autenticacao e Sessao: proxima sprint oficial.

O repositorio ja contem codigo e schema para areas mais avancadas, como autenticacao, RBAC, catalogo, PDV, mesas, caixa, impressao, auditoria, dashboard, estoque e relatorios. Essas partes devem ser tratadas como implementacoes existentes a auditar e estabilizar nas proximas sprints, nao como escopo oficialmente aceito em producao.

Ainda nao existe ambiente de producao real, piloto com cliente real ou garantia operacional para uso comercial.

## Stack tecnica

- Next.js `16.2.10` com App Router.
- React `19.2.4`.
- TypeScript.
- Prisma `7.8.0`.
- PostgreSQL.
- `@prisma/adapter-pg` e `pg` para conexao Prisma 7.
- Zod para validacao.
- bcryptjs para hash de senha.
- ESLint 9.
- Tailwind CSS 4.

## Instalacao

```bash
npm install
cp .env.example .env.local
```

Edite `.env.local` com a URL local do PostgreSQL e os valores de seed. Nao use credenciais reais em `.env.example` e nao versione arquivos `.env` locais.

## Configuracao do ambiente

Variaveis principais:

- `DATABASE_URL`: URL PostgreSQL usada pelo Prisma.
- `SEED_OWNER_EMAIL`: e-mail do usuario proprietario criado pelo seed local.
- `SEED_OWNER_PASSWORD`: senha local do usuario proprietario do seed.
- `PRINT_WEBHOOK_URL`: endpoint opcional do agente local de impressao.

Detalhes estao em [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

## Comandos principais

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:seed
npx prisma validate
npx prisma generate
npx prisma migrate deploy
```

Para desenvolvimento local, aplique migrations antes de rodar o seed:

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## Documentacao interna

- [Roadmap](docs/ROADMAP.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Ambiente](docs/ENVIRONMENT.md)
- [Desenvolvimento](docs/DEVELOPMENT.md)
- [Decisoes tecnicas](docs/DECISIONS.md)
- [Sprint 0 - Fundacao Tecnica](docs/sprints/sprint-0-fundacao-tecnica.md)
- [Sprint 1 - Modelagem Base e Multiempresa](docs/sprints/sprint-1-modelagem-base-multiempresa.md)

## O que existe hoje

- Estrutura Next.js com `src/app`, `src/config`, `src/lib` e `src/server`.
- Validacao centralizada de ambiente server-side.
- Prisma Client singleton com adapter PostgreSQL.
- Schema Prisma multiempresa com `Business`, `Branch`, `BusinessSettings`, `User` e entidades operacionais.
- Seed local reexecutavel para empresa, filial, configuracoes e usuario `OWNER`.
- Logger JSON, `AppError` e normalizacao de erros.
- Codigo server-side para modulos operacionais que ainda precisam ser aceitos formalmente nas sprints correspondentes.

## O que ainda nao deve ser tratado como pronto

- Producao real.
- Piloto com cliente real.
- Contratos finais de autenticacao, RBAC, PDV, caixa, estoque, relatorios e observabilidade.
- Hardening para multiplas instancias.
- Backup, deploy e monitoramento de producao.
