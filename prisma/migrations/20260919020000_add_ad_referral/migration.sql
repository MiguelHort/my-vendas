-- Click-to-WhatsApp: guarda de qual anúncio o contato veio (bloco "referral" que a Meta
-- manda na primeira mensagem) e indexa o id do anúncio pra contar conversas por anúncio.
ALTER TABLE "whatsapp_conversations" ADD COLUMN "ad_referral" JSONB;
ALTER TABLE "whatsapp_conversations" ADD COLUMN "ad_source_id" TEXT;
CREATE INDEX "whatsapp_conversations_ad_source_id_idx" ON "whatsapp_conversations"("ad_source_id");
