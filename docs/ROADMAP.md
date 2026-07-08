# Roadmap

Este roadmap organiza o Flow Cafe ate producao real. O status oficial atual considera apenas Sprint 0 e Sprint 1 concluidas; codigo existente de sprints futuras deve passar por auditoria, aceite e validacao antes de ser tratado como entregue.

## Status por sprint

| Sprint | Tema | Status |
| --- | --- | --- |
| Sprint 0 | Fundacao Tecnica | Concluida |
| Sprint 1 | Modelagem Base e Multiempresa | Concluida |
| Sprint 2 | Autenticacao e Sessao | Proxima |
| Sprint 3 | RBAC e Seguranca Operacional | Planejada |
| Sprint 4 | Catalogo de Produtos | Planejada |
| Sprint 5 | PDV e Criacao de Pedidos | Planejada |
| Sprint 6 | Mesas e Comandas | Planejada |
| Sprint 7 | Caixa Financeiro | Planejada |
| Sprint 8 | Impressao e Fila | Planejada |
| Sprint 9 | Painel de Operacao | Planejada |
| Sprint 10 | Auditoria e Logs de Negocio | Planejada |
| Sprint 11 | Dashboard Gerencial | Planejada |
| Sprint 12 | Estoque Inteligente | Planejada |
| Sprint 13 | Relatorios Profissionais | Planejada |
| Sprint 14 | Hardening de Seguranca | Planejada |
| Sprint 15 | Observabilidade e Monitoramento | Planejada |
| Sprint 16 | Backup, Deploy e Ambiente de Producao | Planejada |
| Sprint 17 | Testes de Producao | Planejada |
| Sprint 18 | Piloto com Cliente Real | Planejada |

## Fases

### Fase 1 - Fundacao e tenant

- Sprint 0 - Fundacao Tecnica.
- Sprint 1 - Modelagem Base e Multiempresa.

Resultado esperado: projeto estruturado, banco modelado para multiempresa e seed local confiavel.

### Fase 2 - Acesso e seguranca inicial

- Sprint 2 - Autenticacao e Sessao.
- Sprint 3 - RBAC e Seguranca Operacional.

Resultado esperado: login, sessao, contexto autenticado, permissoes e protecoes server-side aceitos.

### Fase 3 - Operacao principal

- Sprint 4 - Catalogo de Produtos.
- Sprint 5 - PDV e Criacao de Pedidos.
- Sprint 6 - Mesas e Comandas.
- Sprint 7 - Caixa Financeiro.
- Sprint 8 - Impressao e Fila.
- Sprint 9 - Painel de Operacao.

Resultado esperado: fluxo operacional basico da cafeteria validado ponta a ponta.

### Fase 4 - Gestao e controle

- Sprint 10 - Auditoria e Logs de Negocio.
- Sprint 11 - Dashboard Gerencial.
- Sprint 12 - Estoque Inteligente.
- Sprint 13 - Relatorios Profissionais.

Resultado esperado: rastreabilidade, indicadores, estoque e relatorios confiaveis.

### Fase 5 - Producao

- Sprint 14 - Hardening de Seguranca.
- Sprint 15 - Observabilidade e Monitoramento.
- Sprint 16 - Backup, Deploy e Ambiente de Producao.
- Sprint 17 - Testes de Producao.
- Sprint 18 - Piloto com Cliente Real.

Resultado esperado: sistema pronto para operacao real controlada.

## Proximos passos recomendados

1. Executar Sprint 2 - Autenticacao e Sessao como proxima sprint oficial.
2. Auditar o codigo de autenticacao ja presente antes de aceitar a sprint.
3. Confirmar contratos de sessao, cookies, expiracao, revogacao e auditoria de login.
4. Validar isolamento por `businessId` em todo fluxo autenticado.
5. Atualizar a documentacao da sprint somente apos testes e aceite.

## Padrao obrigatorio de aceite por sprint

Toda sprint deve terminar com:

- documento em `docs/sprints/`;
- objetivo, entregas, fora do escopo, decisoes e licoes aprendidas;
- checklist tecnico objetivo;
- comandos de validacao executados;
- schema Prisma validado quando houver alteracao de banco;
- build e lint passando;
- seed ou dados de teste atualizados quando necessario;
- nenhuma funcionalidade futura documentada como pronta sem aceite;
- confirmacao explicita de que o isolamento multiempresa foi preservado quando houver dado tenant-scoped.
