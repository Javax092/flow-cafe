# Sprint 11 — Dashboard Gerencial

> Status oficial: planejada. Este documento registra desenho e codigo existente a revisar; nao representa aceite final da Sprint 11.

## Regras dos indicadores

Todos os cálculos são executados no servidor, filtrados pelo `businessId` da sessão e incluem somente vendas com status `COMPLETED`.

- **Faturamento:** soma de `Sale.total`, já considerando descontos.
- **Ticket médio:** faturamento dividido pela quantidade de vendas concluídas.
- **Produtos mais vendidos:** soma de quantidade dos snapshots de itens; o valor exibido é a soma bruta dos itens antes do rateio de descontos da venda.
- **Vendas por dia:** quantidade e faturamento agrupados por `dailyDate` operacional.
- **Forma de pagamento:** soma dos pagamentos vinculados às vendas concluídas.
- **Comparativo:** variação percentual do faturamento contra o período imediatamente anterior, com a mesma quantidade de dias. Quando o período anterior é zero, não é exibido percentual.
- **CMV básico:** soma do custo congelado nas vendas concluídas; margem bruta é faturamento menos CMV.

Os filtros aceitam datas ISO inclusivas, exigem data inicial menor ou igual à final e limitam a consulta a 366 dias. O padrão são os últimos sete dias, incluindo hoje em `America/Manaus`.
