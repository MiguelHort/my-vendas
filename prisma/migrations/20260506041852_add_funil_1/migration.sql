/*
  Warnings:

  - You are about to drop the column `funnel_columns` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "funnel_columns";

-- CreateTable
CREATE TABLE "funnel_columns" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "col_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "funnel_columns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funnel_columns_user_id_position_idx" ON "funnel_columns"("user_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_columns_user_id_col_id_key" ON "funnel_columns"("user_id", "col_id");

-- AddForeignKey
ALTER TABLE "funnel_columns" ADD CONSTRAINT "funnel_columns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
