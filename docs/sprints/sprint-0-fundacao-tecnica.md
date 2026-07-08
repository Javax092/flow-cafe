# Sprint 0 - Fundacao Tecnica

## Status

Concluida.

## Objetivo

Estabelecer a base tecnica minima para evoluir o Flow Cafe com seguranca: estrutura de pastas, validacao de ambiente, acesso ao banco, logger, tratamento de erros, constantes globais, utilitarios e documentacao inicial.

Nao houve entrega de fluxo de negocio nesta sprint.

## Entregas

- Estrutura `src/app`, `src/config`, `src/lib` e `src/server`.
- Validacao server-side de ambiente em `src/config/env.ts`.
- Constantes globais em `src/config/constants.ts`.
- Prisma Client centralizado em `src/server/db/prisma.ts`.
- Uso de Prisma 7 com `@prisma/adapter-pg`.
- Logger JSON em `src/server/logger/logger.ts`.
- `AppError`, `normalizeError` e `toAppError` em `src/server/errors`.
- Utilitarios em `src/lib`, como formatacao de moeda, data, normalizacao de texto e temporizacao.
- Base de documentacao por sprint em `docs/sprints`.

## Fora do escopo

- Login e sessao.
- Produtos e catalogo.
- PDV e criacao de pedidos.
- Mesas e comandas.
- Caixa financeiro.
- Dashboard.
- Deploy de producao.

## Decisoes tecnicas

- Variaveis de ambiente sao validadas uma vez no servidor.
- Segredos nao sao expostos ao cliente.
- `.env.example` documenta apenas nomes e valores locais ficticios.
- Prisma Client usa singleton em desenvolvimento para reduzir conexoes duplicadas durante hot reload.
- Prisma 7 exige adapter de banco em runtime; o projeto usa `@prisma/adapter-pg`.
- Logger emite JSON com timestamp, nivel, mensagem e contexto.
- Stacks de erro ficam restritas ao ambiente de desenvolvimento.
- Erros operacionais devem usar `AppError`; erros inesperados devem ser normalizados antes de chegar ao usuario.
- Locale, moeda e fuso padrao sao `pt-BR`, `BRL` e `America/Manaus`.

## Variaveis

Variaveis relacionadas diretamente a fundacao:

- `DATABASE_URL`: obrigatoria para Prisma e conexao PostgreSQL.
- `NODE_ENV`: gerenciada pelo runtime, aceita `development`, `test` ou `production`.
- `PRINT_WEBHOOK_URL`: opcional, usada por infraestrutura futura de impressao.

As variaveis de seed foram adicionadas para desenvolvimento local e documentadas em [../ENVIRONMENT.md](../ENVIRONMENT.md).

## Validacao

Comandos esperados para validar a fundacao:

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run build
```

## Checklist tecnico

- [x] Estrutura base criada.
- [x] Ambiente validado no servidor.
- [x] Prisma Client centralizado.
- [x] Adapter PostgreSQL configurado para Prisma 7.
- [x] Logger estruturado criado.
- [x] Erros operacionais padronizados.
- [x] Utilitarios comuns isolados em `src/lib`.
- [x] Documentacao inicial criada.

## Licoes aprendidas

- Gerar Prisma Client nao basta no Prisma 7: a instancia em runtime tambem precisa de adapter.
- Validar ambiente cedo reduz falhas difusas em tempo de execucao.
- Build reprodutivel exige cuidado com dependencias externas.
- Separar erro operacional de erro inesperado evita vazamento de detalhes internos.
- A fundacao deve preservar compatibilidade enquanto o projeto evolui por sprints.
