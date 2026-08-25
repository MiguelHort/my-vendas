-- Inbox de Instagram compartilhado (mesmo padrão do inbox de WhatsApp),
-- página /dashboard/instagram. Diferente do WhatsApp, a conversa liga direto
-- num Lead (lead_id) em vez de casar por telefone, porque o IGSID não é telefone.

-- CreateEnum
CREATE TYPE "InstagramDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "InstagramMessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "instagram_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "igsid" TEXT NOT NULL,
    "username" TEXT,
    "last_message_at" TIMESTAMPTZ(6),
    "last_message_preview" TEXT,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "lead_id" UUID,

    CONSTRAINT "instagram_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "ig_message_id" TEXT,
    "direction" "InstagramDirection" NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "body" TEXT,
    "media_url" TEXT,
    "media_id" TEXT,
    "mime_type" TEXT,
    "filename" TEXT,
    "transcription" TEXT,
    "status" "InstagramMessageStatus" NOT NULL DEFAULT 'SENT',
    "error_message" TEXT,
    "sent_by_user_id" UUID,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "instagram_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instagram_conversations_igsid_key" ON "instagram_conversations"("igsid");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_messages_ig_message_id_key" ON "instagram_messages"("ig_message_id");

-- CreateIndex
CREATE INDEX "instagram_messages_conversation_id_timestamp_idx" ON "instagram_messages"("conversation_id", "timestamp");

-- AddForeignKey
ALTER TABLE "instagram_conversations" ADD CONSTRAINT "instagram_conversations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_messages" ADD CONSTRAINT "instagram_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "instagram_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_messages" ADD CONSTRAINT "instagram_messages_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
