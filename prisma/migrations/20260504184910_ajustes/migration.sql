-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cotacao";

-- CreateEnum
CREATE TYPE "SupervisorLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "cotacao"."SegmentType" AS ENUM ('PF', 'PME', 'ADESAO');

-- CreateEnum
CREATE TYPE "cotacao"."AccommodationType" AS ENUM ('ENFERMARIA', 'APARTAMENTO');

-- CreateEnum
CREATE TYPE "cotacao"."PmeAdhesionType" AS ENUM ('LIVRE_ADESAO', 'COMPULSORIO');

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
    "last_chamado_at" TIMESTAMPTZ(6),
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
    "telefone" TEXT,
    "card_color" TEXT,
    "notas" TEXT,
    "etiquetas" TEXT,
    "retornar_em" TIMESTAMPTZ(6),

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

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "admin" BOOLEAN NOT NULL DEFAULT false,
    "is_supervisor" BOOLEAN NOT NULL DEFAULT false,
    "supervisor_code" VARCHAR(16),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisor_broker_links" (
    "id" UUID NOT NULL,
    "supervisor_id" UUID NOT NULL,
    "broker_id" UUID NOT NULL,
    "status" "SupervisorLinkStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "removed_at" TIMESTAMPTZ(6),

    CONSTRAINT "supervisor_broker_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao"."operators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ansNumber" VARCHAR(32),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "colorHex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao"."products" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "commercialName" TEXT NOT NULL,
    "segment" "cotacao"."SegmentType" NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao"."plan_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "coverageJson" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao"."areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao"."cities" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao"."rate_cards" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "planVariantId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "segment" "cotacao"."SegmentType" NOT NULL,
    "accommodation" "cotacao"."AccommodationType" NOT NULL,
    "adhesionType" "cotacao"."PmeAdhesionType",
    "minLives" INTEGER NOT NULL,
    "maxLives" INTEGER NOT NULL,
    "pricesByAge" JSONB NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao"."coparticipation_rules" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT,
    "productId" TEXT,
    "planVariantId" TEXT,
    "areaId" TEXT,
    "segment" "cotacao"."SegmentType",
    "rules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coparticipation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_user_id_idx" ON "leads"("user_id");

-- CreateIndex
CREATE INDEX "leads_lote_producao_id_idx" ON "leads"("lote_producao_id");

-- CreateIndex
CREATE INDEX "lotes_producao_user_id_idx" ON "lotes_producao"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_supervisor_code_key" ON "users"("supervisor_code");

-- CreateIndex
CREATE INDEX "users_stripe_customer_id_idx" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "users_stripe_subscription_id_idx" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "supervisor_broker_links_broker_id_key" ON "supervisor_broker_links"("broker_id");

-- CreateIndex
CREATE INDEX "supervisor_broker_links_supervisor_id_idx" ON "supervisor_broker_links"("supervisor_id");

-- CreateIndex
CREATE INDEX "supervisor_broker_links_status_idx" ON "supervisor_broker_links"("status");

-- CreateIndex
CREATE INDEX "operators_name_idx" ON "cotacao"."operators"("name");

-- CreateIndex
CREATE INDEX "products_operatorId_idx" ON "cotacao"."products"("operatorId");

-- CreateIndex
CREATE INDEX "products_commercialName_idx" ON "cotacao"."products"("commercialName");

-- CreateIndex
CREATE INDEX "plan_variants_productId_planName_idx" ON "cotacao"."plan_variants"("productId", "planName");

-- CreateIndex
CREATE INDEX "areas_name_idx" ON "cotacao"."areas"("name");

-- CreateIndex
CREATE INDEX "cities_name_uf_idx" ON "cotacao"."cities"("name", "uf");

-- CreateIndex
CREATE INDEX "cities_areaId_idx" ON "cotacao"."cities"("areaId");

-- CreateIndex
CREATE INDEX "rate_cards_areaId_segment_accommodation_idx" ON "cotacao"."rate_cards"("areaId", "segment", "accommodation");

-- CreateIndex
CREATE INDEX "rate_cards_operatorId_productId_planVariantId_areaId_idx" ON "cotacao"."rate_cards"("operatorId", "productId", "planVariantId", "areaId");

-- CreateIndex
CREATE INDEX "rate_cards_validFrom_validTo_idx" ON "cotacao"."rate_cards"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "coparticipation_rules_operatorId_idx" ON "cotacao"."coparticipation_rules"("operatorId");

-- CreateIndex
CREATE INDEX "coparticipation_rules_productId_idx" ON "cotacao"."coparticipation_rules"("productId");

-- CreateIndex
CREATE INDEX "coparticipation_rules_planVariantId_idx" ON "cotacao"."coparticipation_rules"("planVariantId");

-- CreateIndex
CREATE INDEX "coparticipation_rules_areaId_idx" ON "cotacao"."coparticipation_rules"("areaId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_lote_producao_id_fkey" FOREIGN KEY ("lote_producao_id") REFERENCES "lotes_producao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_producao" ADD CONSTRAINT "lotes_producao_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_broker_links" ADD CONSTRAINT "supervisor_broker_links_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_broker_links" ADD CONSTRAINT "supervisor_broker_links_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao"."products" ADD CONSTRAINT "products_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "cotacao"."operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao"."plan_variants" ADD CONSTRAINT "plan_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "cotacao"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao"."cities" ADD CONSTRAINT "cities_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "cotacao"."areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao"."rate_cards" ADD CONSTRAINT "rate_cards_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "cotacao"."operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao"."rate_cards" ADD CONSTRAINT "rate_cards_productId_fkey" FOREIGN KEY ("productId") REFERENCES "cotacao"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao"."rate_cards" ADD CONSTRAINT "rate_cards_planVariantId_fkey" FOREIGN KEY ("planVariantId") REFERENCES "cotacao"."plan_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao"."rate_cards" ADD CONSTRAINT "rate_cards_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "cotacao"."areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
