# Arquitetura

O Flow Cafe usa Next.js com App Router, codigo server-side em `src/server`, Prisma como camada de acesso ao PostgreSQL e isolamento multiempresa por `businessId`.

## Estrutura de pastas

```text
src/
  app/       Rotas, paginas, layouts, server actions e route handlers do Next.js.
  config/    Validacao de ambiente e constantes globais.
  lib/       Utilitarios puros, sem dependencia de negocio.
  server/    Servicos, repositorios, autenticacao, RBAC, Prisma, logger e erros.
prisma/
  schema.prisma
  migrations/
  seed.mjs
docs/
  sprints/
```

## Separacao de responsabilidades

### `src/app`

Contem a interface e as bordas HTTP do App Router. Pode chamar services server-side, actions e guards, mas nao deve concentrar regra de negocio complexa.

### `src/config`

`env.ts` valida variaveis de ambiente no servidor com Zod. `constants.ts` centraliza nome da aplicacao, locale, moeda, fuso e codigos HTTP.

### `src/lib`

Guarda funcoes reutilizaveis e pequenas, como formatacao de moeda, data, normalizacao de texto e temporizacao. Nao deve depender de Prisma ou contexto autenticado.

### `src/server`

Concentra codigo exclusivo de servidor:

- `auth`: contexto autenticado, cookies, senha, sessoes e tokens.
- `db`: Prisma Client.
- `errors`: `AppError` e normalizacao.
- `logger`: logger JSON.
- `rbac`: permissoes e guards.
- `repositories`: acesso a dados por dominio.
- `services`: regras de negocio.
- `security`: validacao, rate limit e sanitizacao.
- modulos especificos como `audit`, `business`, `inventory`, `printing` e `reports`.

## Prisma

O projeto usa Prisma 7 com PostgreSQL. O datasource no `schema.prisma` define `provider = "postgresql"` e a URL vem do `prisma.config.ts`.

Em runtime, `src/server/db/prisma.ts` instancia `PrismaClient` com `@prisma/adapter-pg`:

```ts
new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
})
```

Em desenvolvimento, a instancia e preservada em `globalThis` para reduzir conexoes duplicadas durante hot reload.

## Modelo multiempresa

`Business` e o tenant principal. Entidades operacionais carregam `businessId` para isolamento, incluindo usuarios, filiais, categorias, produtos, vendas, pagamentos, caixa, mesas, comandas, estoque, auditoria, impressoes e sessoes.

Regras obrigatorias:

- toda consulta tenant-scoped deve filtrar por `businessId`;
- `businessId` deve vir do contexto autenticado;
- parametros do cliente nao podem trocar o tenant da operacao;
- busca por `id` em dado operacional deve combinar `id` e `businessId`;
- relatorios e dashboards devem agregar apenas dados do tenant atual;
- logs e auditorias devem registrar `businessId` quando o evento pertencer a uma empresa.

## Regras contra vazamento entre tenants

- Nunca confiar em `businessId` enviado por formulario, query string ou body.
- Nunca fazer `findUnique` por `id` isolado em entidade tenant-scoped quando o resultado alimenta regra de negocio.
- Nunca listar dados sem filtro por `businessId`.
- Validar permissoes depois de resolver o usuario atual.
- Seeds locais devem usar chaves unicas compostas do schema.
- Testes de novas sprints devem incluir pelo menos um cenario que prove isolamento entre empresas quando houver dado compartilhavel por rota.

## Contexto autenticado esperado

O fluxo server-side esperado para as proximas sprints e:

```text
Cookie de sessao
  -> AuthSession valida e nao revogada
  -> User ativo
  -> Business ativo
  -> AuthContext { userId, businessId, role, email, name }
  -> RBAC opcional por permissao
  -> Service
  -> Repository filtrando por businessId
```

Sprint 2 deve aceitar formalmente login, logout, criacao, expiracao e revogacao de sessoes. Sprint 3 deve aceitar formalmente RBAC e seguranca operacional.
