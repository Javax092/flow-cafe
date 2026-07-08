# Sprint 12 — Estoque Inteligente

> Status oficial: planejada. Este documento registra desenho e codigo existente a revisar; nao representa aceite final da Sprint 12.

## Regra de saldo

Estoque negativo não é permitido. Saídas manuais e vendas são recusadas integralmente quando algum insumo não cobre a quantidade necessária. Os insumos da venda são bloqueados em ordem estável dentro da transação, evitando baixa concorrente acima do saldo.

Produtos sem ficha técnica continuam vendáveis e geram CMV zero. Isso permite implantação gradual, mas esses produtos devem ser tratados como ficha pendente pela gestão.

## Movimentações e custo

- `ENTRY`: entrada com custo unitário; recalcula custo médio ponderado.
- `OUT`: perda ou saída manual com motivo.
- `SALE`: baixa automática conforme ficha técnica.
- `REVERSAL`: devolução automática ao cancelar uma venda.
- `INVENTORY`: ajuste entre saldo esperado e quantidade contada.

Todos os movimentos preservam quantidade, saldo antes/depois, custo vigente, operador, motivo e horário.

## CMV básico

No momento da venda, cada item recebe `costSubtotal` e a venda recebe `costTotal`, calculados com o custo médio dos insumos naquele instante. O dashboard gerencial soma `Sale.costTotal` apenas para vendas concluídas e apresenta CMV, margem bruta e percentual de margem. Alterações futuras de custo não reescrevem o histórico.
