-- Novas etapas do funil (dashboard/funil/page.tsx): "Triagem" virou dois passos
-- ("Triagem Iniciada"/"Triagem Completa"), "Cotação" e "Avaliando" ganharam
-- nomes mais claros, e "Início" e "Aguardando Pagamento" são etapas novas sem
-- lead nenhum ainda (não precisam de remapeamento). "Backlog", "Fechamento",
-- "Concluído", "Retornar" e "Dispensado" não mudaram de nome.
--
-- `leads.status` é texto livre (sem enum/FK) — esse UPDATE é só pra não deixar
-- lead nenhum com um status que sumiu da lista de colunas do funil.
UPDATE "leads" SET "status" = 'Triagem Iniciada' WHERE "status" = 'Triagem';
UPDATE "leads" SET "status" = 'Cotação Enviada' WHERE "status" = 'Cotação';
UPDATE "leads" SET "status" = 'Avaliando Cotação' WHERE "status" = 'Avaliando';
