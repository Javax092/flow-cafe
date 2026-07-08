# Relatorios profissionais - calculos

> Status oficial: planejado para Sprint 13. Este documento registra regras de calculo existentes ou propostas a validar; nao representa aceite final de relatorios profissionais.

## Escopo

Os relatorios administrativos usam apenas dados do negocio autenticado e vendas com `Sale.status = COMPLETED`.
Vendas canceladas entram somente como indicador separado de quantidade e valor cancelado.

## Periodo

- Relatorio diario: por padrao usa a data operacional atual.
- Relatorio mensal: por padrao usa do primeiro dia do mes atual ate a data operacional atual.
- Periodos informados manualmente usam `Sale.dailyDate` e aceitam no maximo 366 dias.

## Resumo financeiro

- Subtotal: soma de `Sale.subtotal`.
- Descontos: soma de `Sale.discount`.
- Faturamento liquido: soma de `Sale.total`.
- CMV: soma de `Sale.costTotal`, preenchido pela baixa de estoque no momento da venda.
- Margem bruta: `faturamento liquido - CMV`.
- Percentual de margem bruta: `margem bruta / faturamento liquido * 100`.
- Vendas concluidas: contagem de vendas concluidas no periodo.
- Ticket medio: `faturamento liquido / vendas concluidas`.
- Vendas canceladas: contagem de vendas com `Sale.status = CANCELLED`.
- Total cancelado: soma de `Sale.total` das vendas canceladas.

## Formas de pagamento

Os totais por forma de pagamento somam `Payment.amount` vinculado a vendas concluidas do periodo.
As formas exibidas sao dinheiro, PIX, credito e debito.

## Conferencia e fechamento por caixa

Cada caixa vem de `CashSession.dailyDate` no periodo.

O esperado em dinheiro segue a mesma regra do fechamento operacional:

`esperado = abertura + recebimentos em dinheiro + suprimentos - sangrias`

Onde:

- Abertura: `CashSession.openingAmount`.
- Recebimentos em dinheiro: soma de `Payment.amount` com `Payment.method = CASH` das vendas concluidas do caixa.
- Suprimentos: soma de `CashMovement.amount` com `type = CASH_IN`.
- Sangrias: soma de `CashMovement.amount` com `type = CASH_OUT`.
- Contado: `CashSession.closingAmount`, quando o caixa ja foi fechado.
- Diferenca: `CashSession.difference`, quando fechado; em caixa aberto, se houver contado informado futuramente, a diferenca deve ser `contado - esperado`.

O total de vendas do caixa soma `Sale.total` das vendas concluidas da sessao.

## Fechamento por operador

O operador e o `Sale.userId` registrado na venda.

Por operador:

- Vendas: contagem de vendas concluidas.
- Faturamento: soma de `Sale.total`.
- Descontos: soma de `Sale.discount`.
- CMV: soma de `Sale.costTotal`.
- Margem: `faturamento - CMV`.
- Ticket medio: `faturamento / vendas`.

## Produtos

Produtos sao agrupados por `SaleItem.productId`.
Quando nao houver produto vinculado, o agrupamento usa o snapshot do nome gravado no item.

Por produto:

- Quantidade: soma de `SaleItem.quantity`.
- Faturamento: soma de `SaleItem.subtotal`.
- CMV: soma de `SaleItem.costSubtotal`.
- Margem: `faturamento - CMV`.
- Categoria: categoria atual do produto; quando ausente, `Sem categoria`.

## Categorias

Categorias sao agrupadas pela categoria atual do produto vendido.
Itens sem categoria entram em `Sem categoria`.

Por categoria:

- Quantidade: soma de `SaleItem.quantity`.
- Faturamento: soma de `SaleItem.subtotal`.
- CMV: soma de `SaleItem.costSubtotal`.
- Margem: `faturamento - CMV`.

## Exportacoes

- CSV: contem todas as secoes do relatorio para conferencia detalhada.
- PDF: contem resumo imprimivel e as principais linhas operacionais; listas extensas devem ser conferidas no CSV.
