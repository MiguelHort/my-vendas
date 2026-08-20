-- Transcrição de áudio sob demanda (botão "Ver transcrição") — cacheada aqui
-- pra não chamar o Gemini de novo toda vez que a mensagem for exibida.

-- AlterTable
ALTER TABLE "whatsapp_messages"
  ADD COLUMN "transcription" TEXT;
