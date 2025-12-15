-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "data_entrada" TIMESTAMPTZ(6) NOT NULL,
    "origem" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "valor_comissao" DECIMAL(65,30),
    "data_venda" TIMESTAMPTZ(6),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "estado" TEXT,
    "lote_producao_id" UUID,
    "cidade" TEXT,
    "qtd_vidas" INTEGER NOT NULL,
    "idades" TEXT,
    "possui_cnpj" BOOLEAN,
    "tem_plano_anterior" BOOLEAN,
    "operadora_anterior" TEXT,
    "tempo_plano_anterior" TEXT,
    "modalidade" TEXT,
    "operadora_ofertada" TEXT,
    "acomodacao" TEXT,
    "valor_mensalidade" DECIMAL(65,30),
    "coparticipacao" TEXT,
    "motivo_dispensa" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes_producao" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "data_acao" TIMESTAMPTZ(6) NOT NULL,
    "volume_total_chamado" INTEGER NOT NULL,
    "estado_regiao" TEXT NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "qtd_ligacao" INTEGER NOT NULL,
    "qtd_leads_novos" INTEGER NOT NULL,
    "qtd_retrabalhos" INTEGER NOT NULL,
    "qtd_indicacao" INTEGER NOT NULL,
    "qtd_presencial" INTEGER NOT NULL,

    CONSTRAINT "lotes_producao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE INDEX "leads_user_id_idx" ON "leads"("user_id");

-- CreateIndex
CREATE INDEX "leads_lote_producao_id_idx" ON "leads"("lote_producao_id");

-- CreateIndex
CREATE INDEX "lotes_producao_user_id_idx" ON "lotes_producao"("user_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_lote_producao_id_fkey" FOREIGN KEY ("lote_producao_id") REFERENCES "lotes_producao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_producao" ADD CONSTRAINT "lotes_producao_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
