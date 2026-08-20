-- Nome original do arquivo pra mensagens de documento (imagem/áudio não usam isso).

-- AlterTable
ALTER TABLE "whatsapp_messages"
  ADD COLUMN "filename" TEXT;
