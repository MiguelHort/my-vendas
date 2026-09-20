-- Estrutura para guardar as tabelas de preço da PX no banco do CRM (PostgreSQL).
-- Execute uma vez:  psql "$DATABASE_URL" -f schema.sql

-- Um registro por produto da PX (ex.: 12 = Amil SC).
CREATE TABLE IF NOT EXISTS px_produtos (
  px_id            INTEGER PRIMARY KEY,
  nome             TEXT NOT NULL,
  operadora        TEXT,
  operadora_px_id  INTEGER,
  categoria_px_id  INTEGER,
  visivel          BOOLEAN NOT NULL DEFAULT TRUE,
  hash_conteudo    TEXT NOT NULL,            -- usado para saber se a tabela mudou
  sincronizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catálogo de planos de cada produto (Amil Prata, Amil S380, Black I R1...).
CREATE TABLE IF NOT EXISTS px_planos (
  produto_px_id  INTEGER NOT NULL REFERENCES px_produtos(px_id) ON DELETE CASCADE,
  px_plano_id    INTEGER NOT NULL,
  nome           TEXT NOT NULL,
  codigo_ans     TEXT,
  acomodacao     TEXT,
  abrangencia    TEXT,
  PRIMARY KEY (produto_px_id, px_plano_id)
);

-- Cada "tabela de preço" do produto, com as regras de quem pode usá-la.
-- Na PX isso vem de tableBinds[] + tableBinds[].valueTable.
CREATE TABLE IF NOT EXISTS px_tabelas (
  px_vinculo_id           INTEGER PRIMARY KEY,   -- tableBinds[].id
  px_tabela_id            INTEGER NOT NULL,      -- tableBinds[].valueTable.id
  produto_px_id           INTEGER NOT NULL REFERENCES px_produtos(px_id) ON DELETE CASCADE,
  modalidade              TEXT,                  -- PME | Adesão
  linha                   TEXT,                  -- Amil | Selecionada | Black
  coparticipacao          TEXT,                  -- Parcial | Completa
  coparticipacao_detalhe  TEXT,                  -- ex.: 40%
  contratacao             TEXT,                  -- Compulsório | Opcional/Livre Adesão | Indiferente
  mei                     BOOLEAN NOT NULL,      -- true = tabela para empresas MEI
  obstetricia             BOOLEAN NOT NULL,
  idade_unica             BOOLEAN NOT NULL,
  vidas_min               INTEGER NOT NULL,
  vidas_max               INTEGER NOT NULL,
  idade_min               INTEGER NOT NULL,
  idade_max               INTEGER NOT NULL,
  desconto_percentual     NUMERIC(6,2) NOT NULL DEFAULT 0,
  administradora          TEXT,                  -- ex.: Supermed (Adesão)
  entidades               JSONB NOT NULL DEFAULT '[]',  -- entidades de classe (Adesão)
  vigencia_inicio         TIMESTAMPTZ,
  vigencia_fim            TIMESTAMPTZ,
  visivel                 BOOLEAN NOT NULL DEFAULT TRUE,
  ordem                   INTEGER NOT NULL DEFAULT 0,
  inconsistencias         JSONB NOT NULL DEFAULT '[]'   -- problemas encontrados nos dados da PX
);
CREATE INDEX IF NOT EXISTS px_tabelas_produto_idx ON px_tabelas (produto_px_id);
CREATE INDEX IF NOT EXISTS px_tabelas_busca_idx ON px_tabelas (modalidade, mei, vidas_min);

-- Preço de cada plano, em cada tabela, em cada faixa etária.
CREATE TABLE IF NOT EXISTS px_precos (
  px_vinculo_id  INTEGER NOT NULL REFERENCES px_tabelas(px_vinculo_id) ON DELETE CASCADE,
  px_plano_id    INTEGER NOT NULL,
  plano_nome     TEXT NOT NULL,
  acomodacao     TEXT,
  plano_visivel  BOOLEAN NOT NULL DEFAULT TRUE,
  plano_ordem    INTEGER NOT NULL DEFAULT 0,
  faixa_id       INTEGER NOT NULL,           -- 1 a 10 (faixas da ANS)
  idade_min      INTEGER NOT NULL,
  idade_max      INTEGER NOT NULL,
  valor          NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (px_vinculo_id, px_plano_id, faixa_id)
);

-- Cotações geradas no CRM. O resultado guarda uma cópia dos preços usados,
-- para a cotação não mudar quando a tabela for reajustada.
CREATE TABLE IF NOT EXISTS cotacoes (
  id         BIGSERIAL PRIMARY KEY,
  lead_id    BIGINT,                          -- ligue à tabela de leads do seu CRM
  entrada    JSONB NOT NULL,
  resultado  JSONB NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cotacoes_lead_idx ON cotacoes (lead_id);

-- Histórico de execuções do job de sincronização.
CREATE TABLE IF NOT EXISTS px_sync_log (
  id             BIGSERIAL PRIMARY KEY,
  iniciado_em    TIMESTAMPTZ NOT NULL,
  finalizado_em  TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL,               -- ok | com_erros
  detalhes       JSONB NOT NULL
);
