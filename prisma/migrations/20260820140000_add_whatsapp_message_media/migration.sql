-- Suporte a áudio (recebido e enviado) no inbox de WhatsApp: guarda o media id
-- e o mime type retornados pela Cloud API pra permitir tocar/reenviar depois.

-- AlterTable
ALTER TABLE "whatsapp_messages"
  ADD COLUMN "media_id" TEXT,
  ADD COLUMN "mime_type" TEXT;
