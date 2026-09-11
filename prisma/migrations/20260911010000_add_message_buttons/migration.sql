-- Botões de uma mensagem interativa ([{ id, title }]) — usado pra mostrar no inbox
-- as perguntas do quiz com seus botões. Só exibição.

ALTER TABLE "whatsapp_messages" ADD COLUMN "buttons" JSONB;
