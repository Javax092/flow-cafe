# Sprint 10 — Auditoria e Logs de Negócio

> Status oficial: planejada. Este documento registra desenho e codigo existente a revisar; nao representa aceite final da Sprint 10.

## Estrutura

`AuditLog` registra tenant, usuário, ação, entidade, identificador, data, motivo, estado anterior, estado posterior e metadados complementares. Os snapshots monetários são armazenados como strings decimais para preservar o valor exato.

## Cobertura

- criação, status e ordenação de produtos e categorias;
- criação de vendas;
- cancelamento de venda com motivo obrigatório e snapshots antes/depois;
- abertura e fechamento de caixa;
- suprimento e sangria com operador, valor e justificativa;
- acessos negados pelo RBAC.

Os eventos críticos são inseridos na mesma transação da alteração auditada. Se o log falhar, a operação também é revertida.

## Imutabilidade

A aplicação expõe somente listagem em `/auditoria`, restrita a `OWNER`. Não existem actions de edição ou exclusão. Adicionalmente, o trigger PostgreSQL `AuditLog_prevent_update_delete` rejeita qualquer `UPDATE` ou `DELETE`, inclusive fora da UI.

Cancelamentos só são aceitos com motivo de 5 a 300 caracteres, por `OWNER` ou `MANAGER`, e enquanto o caixa associado ainda estiver aberto.
