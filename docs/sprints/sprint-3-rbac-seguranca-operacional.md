# Sprint 3 — RBAC e Segurança Operacional

> Status oficial: planejada. Este documento registra desenho e codigo existente a revisar; nao representa aceite final da Sprint 3.

## Papéis

- `OWNER`: administração integral da empresa.
- `MANAGER`: gestão da operação, produtos, caixa e relatórios.
- `CASHIER`: vendas e operações de caixa.
- `WAITER`: consulta de produtos e registro/consulta de vendas.

## Matriz de permissões

| Permissão | OWNER | MANAGER | CASHIER | WAITER |
| --- | :---: | :---: | :---: | :---: |
| Consultar produtos | ✓ | ✓ | ✓ | ✓ |
| Visualizar painel operacional | ✓ | ✓ | ✓ | ✓ |
| Alterar produtos | ✓ | ✓ | — | — |
| Consultar/criar vendas | ✓ | ✓ | ✓ | ✓ |
| Aplicar desconto | ✓ | ✓ | — | — |
| Operar mesas e comandas | ✓ | ✓ | ✓ | ✓ |
| Cadastrar mesas | ✓ | ✓ | — | — |
| Visualizar fila de impressão | ✓ | ✓ | ✓ | ✓ |
| Processar/reenviar impressão | ✓ | ✓ | ✓ | — |
| Cancelar vendas | ✓ | ✓ | — | — |
| Acessar/operar caixa | ✓ | ✓ | ✓ | — |
| Consultar relatórios | ✓ | ✓ | — | — |
| Visualizar estoque | ✓ | ✓ | ✓ | — |
| Gerenciar estoque e ficha técnica | ✓ | ✓ | — | — |
| Gerenciar usuários | ✓ | — | — | — |
| Alterar configurações críticas | ✓ | — | — | — |
| Consultar auditoria | ✓ | — | — | — |

## Aplicação server-side

`requirePermission()` é o guard das operações de negócio. Ele obtém o usuário da sessão no servidor e devolve o contexto apenas quando o papel possui a permissão solicitada. Repositórios continuam recebendo o `businessId` exclusivamente desse contexto.

`requireRoutePermission()` protege segmentos sensíveis no servidor. `/caixa` exige `VIEW_CASH`; `/admin` exige `MANAGE_CRITICAL_SETTINGS`. O Proxy da autenticação continua bloqueando visitantes, enquanto o guard confirma a autorização com os dados atuais do banco.

Toda negação autenticada cria um `AuditLog` com a ação `ACCESS_DENIED`, tenant, usuário, papel, permissão, IP e user-agent. O log não armazena credenciais nem o cookie de sessão.
