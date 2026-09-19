import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { criarRepositorioPrisma } from "../src/lib/px/repositorio";
import { idsDosProdutos, sincronizar } from "../src/lib/px/sync";

// Sincroniza as tabelas de preço da PX à mão:  npm run px:sync
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const resultado = await sincronizar(idsDosProdutos(), { repo: criarRepositorioPrisma(prisma) });

    console.table(
      resultado.relatorio.map(({ inconsistencias, ...r }) => ({
        ...r,
        inconsistencias: inconsistencias?.length ?? 0,
      }))
    );
    for (const r of resultado.relatorio) {
      for (const i of r.inconsistencias ?? []) console.warn(`[inconsistência] ${r.nome}: ${i}`);
    }
    console.log(`Status: ${resultado.status}`);
    process.exitCode = resultado.status === "ok" ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
