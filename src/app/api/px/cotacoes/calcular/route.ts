import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { EntradaInvalida, parseEntrada } from "@/lib/px/cotacao";
import { cotar, statusSincronizacao } from "@/lib/px/servico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Calcula uma cotação (sem salvar) pra tela mostrar as opções. Usa só as tabelas salvas; nunca chama a PX. */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);

  try {
    const entrada = parseEntrada(body?.entrada ?? body);
    const [calculo, sync] = await Promise.all([cotar(prisma, entrada), statusSincronizacao(prisma)]);
    return NextResponse.json({
      vidas: calculo.vidas,
      resultados: calculo.resultados,
      excluidas: calculo.excluidas,
      sincronizacao: { ultima_ok_em: sync.ultima_ok_em, defasada: sync.defasada },
    });
  } catch (err) {
    if (err instanceof EntradaInvalida) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[px] erro ao calcular cotação:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erro ao calcular a cotação" }, { status: 500 });
  }
}
