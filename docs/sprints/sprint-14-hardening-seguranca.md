# Sprint 14 - Hardening de Seguranca

> Status oficial: planejada. Este documento registra desenho e codigo existente a revisar; nao representa aceite final da Sprint 14.

## Controles aplicados

- Rate limit em memoria para login, rotas protegidas no proxy e server actions criticas.
- Headers de seguranca no proxy: CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, CORP e HSTS quando HTTPS.
- Sanitizacao centralizada para campos textuais, removendo caracteres de controle e sinais de tag antes de persistir dados vindos de formularios.
- Validacao forte com Zod em actions e rota de exportacao gerencial.
- Protecao curta contra acoes duplicadas em vendas, caixa, comandas, catalogo, estoque, impressao e cancelamento de venda.

## Rotas e actions criticas

- `/login`: rate limit por IP e e-mail antes da consulta de usuario.
- `/pdv`: criacao de venda com carrinho validado, texto sanitizado e bloqueio de duplicidade.
- `/caixa`: abertura, fechamento, suprimento e sangria com validacao monetaria, rate limit e duplicidade.
- `/mesas`: abertura/fechamento de comanda, pedidos e transferencias com IDs fortes e duplicidade.
- `/catalogo`: produtos e categorias com permissao de gestao, sanitizacao e validacao de preco/ordem.
- `/estoque`: entradas, saidas, receitas e contagens com permissao de inventario e validacao numerica.
- `/impressoes`: processamento e retentativa com rate limit e permissao no servico de impressao.
- `/gerencial/export`: query string validada com Zod e acesso protegido por permissao de relatorios.

## Revisao de permissoes

Os servicos mantem a autorizacao de negocio no servidor, independente da UI:

- Vendas: `CREATE_SALE`, `APPLY_DISCOUNT`, `CANCEL_SALE`, `VIEW_SALES`.
- Caixa: `VIEW_CASH`, `OPEN_CASH_SESSION`, `CLOSE_CASH_SESSION`, `REGISTER_CASH_MOVEMENT`.
- Catalogo: `VIEW_PRODUCTS`, `MANAGE_PRODUCTS`.
- Mesas/comandas: `MANAGE_TABS`, `CONFIGURE_TABLES`.
- Estoque: `VIEW_INVENTORY`, `MANAGE_INVENTORY`.
- Relatorios: `VIEW_REPORTS`.
- Auditoria: `VIEW_AUDIT_LOGS`.

## Limites

O rate limit e a trava de duplicidade atuais usam memoria do processo. Para multiplas instancias em producao, migrar esses estados para Redis ou outro armazenamento compartilhado.
