-- Leads are no longer owned by a user (shared across the whole team) and the
-- SDR de IA (WhatsApp AI lead-qualification bot) and Alertas (WhatsApp new-lead
-- notifications) features are removed entirely.

-- DropTable (respecting FK dependency order)
DROP TABLE IF EXISTS "ai_usage_log";
DROP TABLE IF EXISTS "sdr_messages";
DROP TABLE IF EXISTS "sdr_conversations";
DROP TABLE IF EXISTS "sdr_config";
DROP TABLE IF EXISTS "whatsapp_instances";
DROP TABLE IF EXISTS "user_alert_config";

-- AlterTable: leads become shared (drop ownership) and drop SDR qualification columns
ALTER TABLE "leads"
  DROP COLUMN IF EXISTS "user_id",
  DROP COLUMN IF EXISTS "sdr_categoria",
  DROP COLUMN IF EXISTS "sdr_score",
  DROP COLUMN IF EXISTS "sdr_qualification_data";
