import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // aponta para a PASTA do schema (multi-file)
  schema: "prisma/schema",

  migrations: {
    path: "prisma/migrations",

    // 🔥 ISSO RESOLVE O ERRO "No seed command configured"
    seed: "tsx prisma/seed.ts",
  },

  // IMPORTANTE: use a conexão DIRECT (5432) aqui
  datasource: {
    url: env("DIRECT_URL"),
  },
});