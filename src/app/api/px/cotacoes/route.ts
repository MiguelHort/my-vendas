import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { EntradaInvalida, parseEntrada } from "@/lib/px/cotacao";
import {
  LeadNaoEncontrado,
  cotacaoParaDto,
  listarCotacoes,
  parseSelecionadas,
  salvarCotacao,
} from "@/lib/px/servico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lista cotações salvas. `?lead_id=` filtra por lead; sem ele, traz as mais recentes. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = req.nextUrl.searchParams;
  const leadId = params.get("lead_id") ?? undefined;
  if (leadId && !UUID.test(leadId)) {
    return NextResponse.json({ error: "lead_id inválido" }, { status: 400 });
  }
  const limite = Number(params.get("limit")) || 50;

  const cotacoes = await listarCotacoes(prisma, { leadId, limite });
  return NextResponse.json({ cotacoes: cotacoes.map(cotacaoParaDto) });
}

/**
 * Salva uma cotação (com ou sem lead) com as opções que o corretor escolheu.
 * Body: { lead_id?, entrada, selecionadas: [{ px_vinculo_id, px_plano_id }] }
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  const leadId = typeof body.lead_id === "string" && body.lead_id ? body.lead_id : null;
  if (leadId && !UUID.test(leadId)) {
    return NextResponse.json({ error: "lead_id inválido" }, { status: 400 });
  }

  try {
    const cotacao = await salvarCotacao(prisma, {
      leadId,
      criadoPorId: auth.user.id,
      entrada: parseEntrada(body.entrada),
      selecionadas: parseSelecionadas(body.selecionadas),
    });
    return NextResponse.json({ cotacao: cotacaoParaDto(cotacao) }, { status: 201 });
  } catch (err) {
    if (err instanceof EntradaInvalida) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof LeadNaoEncontrado) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[px] erro ao salvar cotação:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erro ao salvar a cotação" }, { status: 500 });
  }
}
