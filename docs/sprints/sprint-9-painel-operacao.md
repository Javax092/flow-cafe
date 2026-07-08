# Sprint 9 — Painel de Operação

> Status oficial: planejada. Este documento registra desenho e codigo existente a revisar; nao representa aceite final da Sprint 9.

## Indicadores

- **Pedidos do dia:** vendas concluídas com `dailyDate` do dia operacional + pedidos de comanda criados no mesmo dia em `America/Manaus`.
- **Mesas abertas:** comandas com status `OPEN`.
- **Pedidos pendentes:** pedidos pertencentes a comandas ainda `OPEN`. Este indicador representa consumo ainda não encerrado; não é status de preparo.
- **Vendas concluídas:** soma de `Sale.total` das vendas `COMPLETED` do dia.
- **Recebimentos:** soma de `Payment.amount` das vendas concluídas, agrupada por dinheiro, PIX, crédito e débito.

## Alertas

- caixa fechado;
- jobs de impressão em falha;
- impressões pendentes há mais de cinco minutos;
- comandas abertas há mais de quatro horas;
- agente de impressão sem configuração.

As consultas são executadas no servidor e filtradas pelo `businessId` da sessão. O painel solicita uma nova renderização ao servidor a cada 15 segundos enquanto a aba está visível, sem recarregar a página ou perder a posição de rolagem.
