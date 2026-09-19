-- Dia em que a comissão da venda cai na conta (costuma ser alguns dias depois da venda).
-- Opcional: leads antigos ficam sem data e o sistema cai na data da venda.
ALTER TABLE "leads" ADD COLUMN "data_pagamento_comissao" TIMESTAMPTZ(6);
