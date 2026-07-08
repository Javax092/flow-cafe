# Sprint 1 - Modelagem Base e Multiempresa

## Status

Concluida.

## Objetivo

Criar a base persistente multiempresa do Flow Cafe, com tenant, filial, usuario, configuracoes por empresa, papeis iniciais, seed local reexecutavel e auditoria minima.

## Entidades criadas ou consolidadas

### Business

Representa o tenant. Possui `slug` unico global, dados cadastrais basicos, status ativo e relacionamentos com usuarios, filiais, configuracoes e entidades operacionais.

### Branch

Representa uma unidade da empresa. O campo `code` e unico dentro do tenant por `@@unique([businessId, code])`.

### BusinessSettings

Configuracao 1:1 por empresa, com padroes `pt-BR`, `America/Manaus` e `BRL`.

### User

Usuario pertence obrigatoriamente a uma empresa e pode pertencer a uma filial. O e-mail e unico por empresa por `@@unique([businessId, email])`. A senha e persistida apenas em `passwordHash`.

### AuditLog

Registro de auditoria em nivel de aplicacao, sempre ligado a `businessId` e opcionalmente a `userId`. A cobertura completa de auditoria operacional pertence a sprint futura.

## Relacoes

```text
Business 1--N Branch
Business 1--1 BusinessSettings
Business 1--N User
Branch   1--N User, opcional no lado do User
Business 1--N AuditLog
User     1--N AuditLog, opcional no lado do AuditLog
```

O schema atual tambem possui entidades operacionais com `businessId`, como categorias, produtos, vendas, pagamentos, caixa, mesas, comandas, estoque, impressao, sessoes e auditorias de login. Essas entidades existem no codigo atual, mas a conclusao oficial de cada modulo deve ser confirmada nas sprints correspondentes.

## Isolamento multiempresa

- Toda entidade operacional deve ser filtrada por `businessId`.
- Repositorios e servicos devem receber `businessId` do contexto autenticado.
- `businessId` enviado pelo cliente nao deve definir o tenant da operacao.
- Relacionamentos e indices compostos devem impedir colisoes entre empresas.
- Consultas por `id` devem combinar o identificador com `businessId` sempre que o dado for tenant-scoped.
- Logs, auditoria e relatorios tambem devem preservar o filtro por tenant.

## Migracao de papeis

Papeis iniciais em `UserRole`:

- `OWNER`: proprietario e administrador do tenant.
- `MANAGER`: gerente operacional.
- `CASHIER`: operador de caixa.
- `WAITER`: garcom ou atendente.

Historicamente, papeis anteriores foram migrados para a nova base: `ADMIN` virou `OWNER` e `ATTENDANT` virou `CASHIER`. `WAITER` e o padrao atual para novos usuarios.

## Branch opcional no usuario

`User.branchId` e opcional para permitir usuarios corporativos, administradores de tenant e compatibilidade com dados criados antes da introducao de filiais.

## Seed local

O seed esta em `prisma/seed.mjs` e e configurado em `prisma.config.ts`.

Execute:

```bash
npx prisma migrate deploy
npm run db:seed
```

O seed e transacional e pode ser reexecutado. Ele cria ou atualiza:

- empresa `flow-cafe-local`;
- filial `MATRIZ`;
- configuracoes locais do tenant;
- usuario `OWNER` com `SEED_OWNER_EMAIL` e `SEED_OWNER_PASSWORD`;
- evento `SEED_APPLIED` em `AuditLog`.

As credenciais padrao sao apenas para desenvolvimento local e devem ser substituidas por ambiente.

## Comandos de validacao

```bash
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run lint
npm run build
```

## Checklist tecnico

- [x] Tenant `Business` modelado.
- [x] Filial `Branch` modelada com unicidade por empresa.
- [x] Configuracoes por empresa modeladas.
- [x] Usuario vinculado a empresa.
- [x] E-mail unico por empresa.
- [x] Filial opcional no usuario.
- [x] Papeis iniciais definidos.
- [x] Seed local reexecutavel.
- [x] Auditoria minima do seed.
- [x] Regras de isolamento por `businessId` documentadas.

## Licoes aprendidas

- Unicidade composta e essencial para multiempresa; e-mail e codigo de filial nao devem ser globais.
- `businessId` precisa ser regra arquitetural, nao detalhe de UI.
- Seeds devem usar as mesmas chaves unicas do modelo para permanecer idempotentes.
- Associacoes novas devem tolerar dados legados.
- Modelagem antecipada nao equivale a aceite funcional de todos os modulos operacionais.
