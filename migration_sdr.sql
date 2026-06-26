-- ============================================================
-- Migration SDR de IA — WinLeads
-- Rodar no Supabase SQL Editor ou via psql
-- ============================================================

-- 1. Campos pendentes de versão anterior (card_color, notas, etiquetas, retornar_em)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS card_color   TEXT,
  ADD COLUMN IF NOT EXISTS notas        TEXT,
  ADD COLUMN IF NOT EXISTS etiquetas    TEXT,
  ADD COLUMN IF NOT EXISTS retornar_em  TIMESTAMPTZ;

-- 2. Campos SDR no lead
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sdr_categoria          VARCHAR(1),
  ADD COLUMN IF NOT EXISTS sdr_score              SMALLINT,
  ADD COLUMN IF NOT EXISTS sdr_qualification_data JSONB;

-- 3. Instância Zavu (uma por corretor)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id    TEXT        NOT NULL UNIQUE,
  status       TEXT        NOT NULL DEFAULT 'disconnected',
  phone_number TEXT,
  connected_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id
  ON public.whatsapp_instances(user_id);

-- 4. Config do SDR por corretor
CREATE TABLE IF NOT EXISTS public.sdr_config (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  enabled                  BOOLEAN     NOT NULL DEFAULT FALSE,
  nome_assistente          TEXT        NOT NULL DEFAULT 'Assistente',
  saudacao                 TEXT,
  tom                      TEXT        NOT NULL DEFAULT 'formal',
  handoff_min_categoria    VARCHAR(1)  NOT NULL DEFAULT 'B',
  followup_max_tentativas  INT         NOT NULL DEFAULT 3,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sdr_config_user_id
  ON public.sdr_config(user_id);

-- 5. Conversas do SDR
CREATE TABLE IF NOT EXISTS public.sdr_conversations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lead_id          UUID        UNIQUE REFERENCES public.leads(id) ON DELETE SET NULL,
  whatsapp_number  TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'active',
  consent_at       TIMESTAMPTZ,
  followup_count   INT         NOT NULL DEFAULT 0,
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, whatsapp_number)
);

CREATE INDEX IF NOT EXISTS idx_sdr_conversations_user_id
  ON public.sdr_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_sdr_conversations_lead_id
  ON public.sdr_conversations(lead_id);

-- 6. Mensagens
CREATE TABLE IF NOT EXISTS public.sdr_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES public.sdr_conversations(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL,
  content          TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sdr_messages_conversation_id
  ON public.sdr_messages(conversation_id);

-- 7. Log de uso de IA (billing)
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id  UUID         REFERENCES public.sdr_conversations(id) ON DELETE SET NULL,
  model            TEXT         NOT NULL,
  call_type        TEXT         NOT NULL,
  tokens_in        INT,
  tokens_out       INT,
  cost_estimate    DECIMAL(10,6),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_id
  ON public.ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at
  ON public.ai_usage_log(created_at);
