-- Remove "lotes de produção" (production batches) entirely. Leads are now
-- always registered one at a time and no longer linked to a batch.

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_lote_producao_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "leads_lote_producao_id_idx";

-- AlterTable
ALTER TABLE "leads" DROP COLUMN IF EXISTS "lote_producao_id";

-- DropTable (also drops its own PK, its user_id FK, and its user_id index)
DROP TABLE IF EXISTS "lotes_producao";
