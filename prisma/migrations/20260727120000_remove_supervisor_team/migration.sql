-- Remove supervisor/team feature

-- DropForeignKey
ALTER TABLE "supervisor_broker_links" DROP CONSTRAINT IF EXISTS "supervisor_broker_links_supervisor_id_fkey";
ALTER TABLE "supervisor_broker_links" DROP CONSTRAINT IF EXISTS "supervisor_broker_links_broker_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "supervisor_broker_links";
DROP TABLE IF EXISTS "member_goals";

-- DropEnum
DROP TYPE IF EXISTS "SupervisorLinkStatus";

-- AlterTable
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "is_supervisor",
  DROP COLUMN IF EXISTS "supervisor_code";
