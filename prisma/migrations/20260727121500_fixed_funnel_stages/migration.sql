-- Remove configurable funnel columns feature; funnel stages are now fixed in app code.

-- DropForeignKey
ALTER TABLE "funnel_columns" DROP CONSTRAINT IF EXISTS "funnel_columns_user_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "funnel_columns";

-- Remap existing leads to the new fixed stage names
UPDATE "leads" SET "status" = 'Triagem' WHERE "status" = 'SDR';
UPDATE "leads" SET "status" = 'Cotação' WHERE "status" = 'Abordagem';
