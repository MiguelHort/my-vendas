-- Remove card personalization (card color, internal notes, tags) from leads.

ALTER TABLE "leads"
  DROP COLUMN IF EXISTS "card_color",
  DROP COLUMN IF EXISTS "notas",
  DROP COLUMN IF EXISTS "etiquetas";
