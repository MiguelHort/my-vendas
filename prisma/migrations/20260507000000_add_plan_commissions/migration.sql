-- CreateTable
CREATE TABLE "public"."plan_commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "operadora" TEXT NOT NULL,
    "comissao_interna" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "comissao_externa" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plan_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_commissions_user_id_idx" ON "public"."plan_commissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_commissions_user_id_operadora_key" ON "public"."plan_commissions"("user_id", "operadora");

-- AddForeignKey
ALTER TABLE "public"."plan_commissions" ADD CONSTRAINT "plan_commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
