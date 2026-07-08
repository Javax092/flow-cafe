# Sprint 7 — Caixa Financeiro

> Status oficial: planejada. Este documento registra desenho e codigo existente a revisar; nao representa aceite final da Sprint 7.

Existe no máximo um `CashSession` aberto por empresa, garantido também por índice único parcial no PostgreSQL. Abertura, suprimento, sangria e fechamento geram registros append-only em `CashMovement`, vinculados ao operador e horário.

O esperado no fechamento é calculado em centavos:

`abertura + recebimentos em dinheiro + suprimentos - sangrias`

Pagamentos PIX e cartões aparecem no resumo de recebimentos, mas não compõem o numerário esperado. A diferença persistida é `valor contado - valor esperado`.

Venda, movimentação e fechamento bloqueiam a mesma sessão durante suas transações. Uma venda iniciada após o fechamento é rejeitada; uma venda já em gravação conclui antes que o fechamento calcule o esperado.
