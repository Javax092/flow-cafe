# Sprint 6 — Mesas e Comandas

> Status oficial: planejada. Este documento registra desenho e codigo existente a revisar; nao representa aceite final da Sprint 6.

Uma `DiningTable` representa a mesa física. Cada ocupação cria uma nova `Tab`, preservando comandas anteriores em vez de reutilizá-las.

- `OPEN`: aceita pedidos e transferência;
- `CLOSED`: imutável para novas operações e mantida no histórico.

Cada inclusão gera um `TabOrder` e seus `TabOrderItem`. Nome e preço do produto são copiados para o item, portanto mudanças posteriores no catálogo não alteram o consumo registrado. Transferências geram registros append-only em `TabTransfer`.

As operações de pedido, transferência e fechamento bloqueiam a comanda no banco durante a transação. Existe também um índice único parcial que impede mais de uma comanda `OPEN` por mesa, inclusive sob requisições concorrentes.
