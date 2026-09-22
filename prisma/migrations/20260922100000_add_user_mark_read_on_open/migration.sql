-- Preferência do usuário: se abrir uma conversa do WhatsApp marca como lida.
-- Default true = comportamento atual (sempre marcava como lida ao abrir).
ALTER TABLE "users" ADD COLUMN "mark_read_on_open" BOOLEAN NOT NULL DEFAULT true;
