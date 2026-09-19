-- Tabelas de preço da PX Tecnologia + cotação calculada localmente.
-- Valores monetários sempre NUMERIC (nunca float).

-- CreateTable
CREATE TABLE "px_produtos" (
    "px_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "operadora" TEXT,
    "operadora_px_id" INTEGER,
    "categoria_px_id" INTEGER,
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "hash_conteudo" TEXT NOT NULL,
    "sincronizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "px_produtos_pkey" PRIMARY KEY ("px_id")
);

-- CreateTable
CREATE TABLE "px_planos" (
    "produto_px_id" INTEGER NOT NULL,
    "px_plano_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo_ans" TEXT,
    "acomodacao" TEXT,
    "abrangencia" TEXT,

    CONSTRAINT "px_planos_pkey" PRIMARY KEY ("produto_px_id","px_plano_id")
);

-- CreateTable
CREATE TABLE "px_tabelas" (
    "px_vinculo_id" INTEGER NOT NULL,
    "px_tabela_id" INTEGER NOT NULL,
    "produto_px_id" INTEGER NOT NULL,
    "modalidade" TEXT,
    "linha" TEXT,
    "coparticipacao" TEXT,
    "coparticipacao_detalhe" TEXT,
    "contratacao" TEXT,
    "mei" BOOLEAN NOT NULL,
    "obstetricia" BOOLEAN NOT NULL,
    "idade_unica" BOOLEAN NOT NULL,
    "vidas_min" INTEGER NOT NULL,
    "vidas_max" INTEGER NOT NULL,
    "idade_min" INTEGER NOT NULL,
    "idade_max" INTEGER NOT NULL,
    "desconto_percentual" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "administradora" TEXT,
    "entidades" JSONB NOT NULL DEFAULT '[]',
    "vigencia_inicio" TIMESTAMPTZ(6),
    "vigencia_fim" TIMESTAMPTZ(6),
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "inconsistencias" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "px_tabelas_pkey" PRIMARY KEY ("px_vinculo_id")
);

-- CreateTable
CREATE TABLE "px_precos" (
    "px_vinculo_id" INTEGER NOT NULL,
    "px_plano_id" INTEGER NOT NULL,
    "plano_nome" TEXT NOT NULL,
    "acomodacao" TEXT,
    "plano_visivel" BOOLEAN NOT NULL DEFAULT true,
    "plano_ordem" INTEGER NOT NULL DEFAULT 0,
    "faixa_id" INTEGER NOT NULL,
    "idade_min" INTEGER NOT NULL,
    "idade_max" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "px_precos_pkey" PRIMARY KEY ("px_vinculo_id","px_plano_id","faixa_id")
);

-- CreateTable
CREATE TABLE "px_sync_log" (
    "id" SERIAL NOT NULL,
    "iniciado_em" TIMESTAMPTZ(6) NOT NULL,
    "finalizado_em" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL,
    "detalhes" JSONB NOT NULL,

    CONSTRAINT "px_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID,
    "criado_por_id" UUID,
    "entrada" JSONB NOT NULL,
    "resultado" JSONB NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "cotacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "px_tabelas_produto_px_id_idx" ON "px_tabelas"("produto_px_id");

-- CreateIndex
CREATE INDEX "px_tabelas_modalidade_mei_vidas_min_idx" ON "px_tabelas"("modalidade", "mei", "vidas_min");

-- CreateIndex
CREATE INDEX "cotacoes_lead_id_idx" ON "cotacoes"("lead_id");

-- AddForeignKey
ALTER TABLE "px_planos" ADD CONSTRAINT "px_planos_produto_px_id_fkey" FOREIGN KEY ("produto_px_id") REFERENCES "px_produtos"("px_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "px_tabelas" ADD CONSTRAINT "px_tabelas_produto_px_id_fkey" FOREIGN KEY ("produto_px_id") REFERENCES "px_produtos"("px_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "px_precos" ADD CONSTRAINT "px_precos_px_vinculo_id_fkey" FOREIGN KEY ("px_vinculo_id") REFERENCES "px_tabelas"("px_vinculo_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
