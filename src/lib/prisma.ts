// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Pool de conexão do pg usando a mesma DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Adapter do Prisma 7 para Postgres
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,               // 👈 AGORA TEM O ADAPTER (resolve o erro do engine "client")
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
