-- Descarta o schema "cotacao" antigo (operators, products, rate_cards, ...): módulo de cotação
-- anterior, sem uso no código. A pedido do usuário em 2026-09-19. Conferido antes: as 7 tabelas
-- estavam VAZIAS e nenhuma tabela do schema public tinha chave estrangeira apontando pra ele.
DROP SCHEMA IF EXISTS "cotacao" CASCADE;
