import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { criarRepositorioPrisma } from "@/lib/px/repositorio";
import { SincronizacaoEmAndamento, idsDosProdutos, sincronizar } from "@/lib/px/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// ~5s por produto + 2s de pausa entre eles; folga pra vários produtos.
export const maxDuration = 300;

/**
 * "Sincronizar agora": baixa os produtos da PX (PX_PRODUTOS) e grava as tabelas de preço.
 * É a única rota que fala com a PX; a cotação nunca chama a PX.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let ids: number[];
  try {
    ids = idsDosProdutos();
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  try {
    const resultado = await sincronizar(ids, { repo: criarRepositorioPrisma(prisma) });
    return NextResponse.json({
      status: resultado.status,
      iniciado_em: resultado.iniciadoEm.toISOString(),
      relatorio: resultado.relatorio,
    });
  } catch (err) {
    if (err instanceof SincronizacaoEmAndamento) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[px-sync] erro inesperado:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erro inesperado na sincronização" }, { status: 500 });
  }
}
