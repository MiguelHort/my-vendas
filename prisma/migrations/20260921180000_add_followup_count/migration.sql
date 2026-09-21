-- Etiqueta fixa de follow-up: contador por conversa, começa em 0 e só aumenta.
ALTER TABLE "whatsapp_conversations" ADD COLUMN "follow_up_count" INTEGER NOT NULL DEFAULT 0;
