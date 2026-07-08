# Decisoes tecnicas

## Validacao centralizada de ambiente

`src/config/env.ts` valida variaveis server-side com Zod. Isso torna falhas de configuracao explicitas e evita leituras dispersas de `process.env`.

## Prisma Client singleton

`src/server/db/prisma.ts` cria uma unica instancia compartilhada em desenvolvimento via `globalThis`. O objetivo e reduzir conexoes duplicadas durante hot reload. Em producao, a instancia segue o ciclo normal do processo.

## Prisma 7 com adapter PostgreSQL

O projeto usa Prisma 7, `@prisma/adapter-pg` e `pg`. O datasource fica em `prisma.config.ts`; o client em runtime recebe `new PrismaPg({ connectionString: env.DATABASE_URL })`.

## Logger JSON

O logger de `src/server/logger/logger.ts` emite JSON com timestamp, nivel, mensagem e contexto. Objetos `Error` sao serializados. Stack aparece apenas em desenvolvimento.

## `AppError` e `normalizeError`

`AppError` representa falhas operacionais conhecidas, com `code`, mensagem, status HTTP e detalhes opcionais. `normalizeError` converte erros para contrato seguro de resposta, usando mensagem generica para erros inesperados.

## Multiempresa por `Business`

`Business` e o tenant. Entidades operacionais usam `businessId`; consultas devem usar o tenant do contexto autenticado.

## `Branch` opcional no usuario

`User.branchId` e opcional. Isso permite usuarios corporativos ou administradores de tenant sem filial fixa e preserva compatibilidade com dados anteriores.

## Papeis iniciais

`UserRole` possui:

- `OWNER`;
- `MANAGER`;
- `CASHIER`;
- `WAITER`.

`WAITER` e o papel padrao para novos usuarios. Permissoes detalhadas pertencem ao modulo de RBAC.

## Seed local reexecutavel

`prisma/seed.mjs` usa upserts e transacao para criar ou atualizar empresa local, filial, configuracoes, usuario `OWNER` e auditoria `SEED_APPLIED`.

## Documentacao por sprint

Cada sprint deve ter documento em `docs/sprints/` com objetivo, escopo, decisoes, validacao e licoes aprendidas. O roadmap so deve marcar uma sprint como concluida apos aceite tecnico.

## Codigo adiantado nao implica aceite

O repositorio contem codigo e migrations para modulos alem da Sprint 1. A existencia de codigo nao altera o status oficial do roadmap; cada sprint futura precisa de revisao, validacao e documentacao de aceite.
