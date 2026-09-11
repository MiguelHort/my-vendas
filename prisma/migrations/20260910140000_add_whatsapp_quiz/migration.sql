-- Quiz de qualificação no primeiro contato pelo WhatsApp.
-- Estado 1:1 com a conversa. `answers` guarda dado de saúde (LGPD) — não logar.

-- CreateEnum
CREATE TYPE "WhatsAppQuizStatus" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDO', 'INTERROMPIDO');

-- CreateTable
CREATE TABLE "whatsapp_quiz_states" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "lead_id" UUID,
    "status" "WhatsAppQuizStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "current_step" TEXT,
    "last_question_wamid" TEXT,
    "last_inbound_wamid" TEXT,
    "invalid_count" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "tem_plano_atual" BOOLEAN,
    "necessidade_principal" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "completed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "whatsapp_quiz_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_quiz_states_conversation_id_key" ON "whatsapp_quiz_states"("conversation_id");

-- AddForeignKey
ALTER TABLE "whatsapp_quiz_states" ADD CONSTRAINT "whatsapp_quiz_states_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_quiz_states" ADD CONSTRAINT "whatsapp_quiz_states_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
