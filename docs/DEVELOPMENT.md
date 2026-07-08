# Desenvolvimento

## Comandos

```bash
npm install
cp .env.example .env.local
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Aplicacao local:

```bash
npm run dev
```

Build de producao:

```bash
npm run build
npm run start
```

## Validacao

Antes de concluir uma alteracao:

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run build
```

Quando houver dependencia de dados locais:

```bash
npx prisma migrate deploy
npm run db:seed
```

## Padrao antes de commit

- Conferir `git diff`.
- Rodar validacoes relevantes.
- Garantir que `.env` e `.env.local` nao entram no commit.
- Atualizar documentacao quando a mudanca altera arquitetura, ambiente, schema ou comportamento de sprint.
- Manter o status do roadmap coerente com o aceite real.

## Convencoes de codigo

- Regras de negocio ficam em `src/server/services`.
- Acesso a dados fica em repositorios ou modulos server-side dedicados.
- UI e actions em `src/app` devem delegar regras complexas ao servidor.
- `businessId` vem do contexto autenticado, nunca do cliente.
- Erros esperados usam `AppError`.
- Erros desconhecidos devem ser normalizados antes de resposta publica.
- Logs devem ser JSON e nao devem conter segredos.
- Utilitarios genericos ficam em `src/lib`.
- Validacao de ambiente fica centralizada em `src/config/env.ts`.

## Fluxo recomendado para novas sprints

1. Ler roadmap e documento da sprint anterior.
2. Auditar o codigo existente relacionado ao tema.
3. Separar o que ja existe do que ainda precisa ser aceito.
4. Implementar ou ajustar apenas o escopo da sprint.
5. Validar isolamento multiempresa.
6. Rodar comandos de validacao.
7. Atualizar `docs/sprints/<sprint>.md`.
8. Atualizar `docs/ROADMAP.md` apenas quando houver aceite.

## Checklist de qualidade

- [ ] Lint executado.
- [ ] Build executado.
- [ ] Prisma validado quando aplicavel.
- [ ] Prisma Client gerado quando aplicavel.
- [ ] Migrations revisadas quando aplicavel.
- [ ] Seed reexecutavel quando alterado.
- [ ] Isolamento por `businessId` preservado.
- [ ] Permissoes server-side preservadas quando aplicavel.
- [ ] Documentacao atualizada.
- [ ] Nenhuma funcionalidade futura documentada como pronta sem aceite.
