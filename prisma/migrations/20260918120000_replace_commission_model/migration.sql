-- Remove o modelo antigo de comissão (por usuário, interno/externo) e substitui
-- por um percentual global por operadora + modalidade (PF/PME/Adesão/Empresarial),
-- a pedido do usuário em 2026-09-18. "Interno"/"externo" deixa de existir.

-- DropForeignKey
ALTER TABLE IF EXISTS "plan_commissions" DROP CONSTRAINT IF EXISTS "plan_commissions_user_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "plan_commissions";

-- AlterTable (Lead não tem mais tipo_comissao)
ALTER TABLE "leads" DROP COLUMN IF EXISTS "tipo_comissao";

-- CreateTable
CREATE TABLE "commission_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operadora" TEXT NOT NULL,
    "modalidade" TEXT NOT NULL,
    "percentual" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "commission_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commission_rates_operadora_modalidade_key" ON "commission_rates"("operadora", "modalidade");

-- Seed dos percentuais definidos pelo usuário — o resto fica com o padrão de
-- 100% (a própria coluna já tem DEFAULT 100, então operadora/modalidade sem
-- linha aqui já cai em 100% via lazy-create da API). DO UPDATE (não DO NOTHING)
-- pra forçar o valor certo mesmo se a linha já existir zerada em 100%.
INSERT INTO "commission_rates" ("operadora", "modalidade", "percentual", "updated_at") VALUES
    ('Amil', 'PME', 250, now()),
    ('Bradesco Saúde', 'PME', 270, now()),
    ('SulAmérica', 'PME', 250, now()),
    ('Hapvida', 'PF', 150, now()),
    ('Hapvida', 'PME', 220, now())
ON CONFLICT ("operadora", "modalidade")
DO UPDATE SET "percentual" = EXCLUDED."percentual", "updated_at" = now();
