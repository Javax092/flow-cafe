# Sprint 8 — Impressão e Fila

> Status oficial: planejada. Este documento registra desenho e codigo existente a revisar; nao representa aceite final da Sprint 8.

## Garantia de persistência

Venda e pedido de comanda criam o `PrintJob` na mesma transação dos dados comerciais. Nenhuma comunicação com impressora ocorre nessa transação. O processador consome apenas jobs persistidos depois, portanto indisponibilidade do agente altera somente o job para `FAILED` e nunca remove ou reverte o pedido.

## Documentos e setores

- `COMMAND`: comanda criada ao adicionar pedido à mesa; setor vem de `Category.printSector`.
- `RECEIPT`: cupom da venda final; setor `CAIXA`.

A chave composta de empresa, pedido, documento e setor torna o enfileiramento idempotente.

## Estados e retry

O fluxo normal é `PENDING → PROCESSING → PRINTED`. Erros geram `FAILED`, incrementam tentativas, armazenam mensagem e agendam retry exponencial até `maxAttempts`. Jobs interrompidos em `PROCESSING` são recuperados como falha. O operador autorizado pode usar **Reenviar**, que retorna o job para `PENDING`.

O transporte HTTP envia os dados ao agente configurado em `PRINT_WEBHOOK_URL`, com timeout de cinco segundos. A tela `/impressoes` expõe fila, setor, tentativas e falha.
