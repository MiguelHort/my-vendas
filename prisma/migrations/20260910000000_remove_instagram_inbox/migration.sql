-- Instagram inbox removido por completo (feature descontinuada).
-- As tabelas/enums foram criados por 20260821000000_add_instagram_inbox.

-- DropTable (ordem respeitando a FK: messages -> conversations)
DROP TABLE IF EXISTS "instagram_messages";
DROP TABLE IF EXISTS "instagram_conversations";

-- DropEnum
DROP TYPE IF EXISTS "InstagramDirection";
DROP TYPE IF EXISTS "InstagramMessageStatus";
