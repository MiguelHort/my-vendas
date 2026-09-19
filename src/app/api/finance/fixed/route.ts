import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authServer";
import { currentMonthKey, isMonthKey, parseMoney } from "@/lib/finance";
import { fixedToDto } from "@/lib/financeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  const descricao = typeof body.descricao === "string" ? body.descricao.trim() : "";
  const valor = parseMoney(body.valor);
  const dia = Number(body.dia_vencimento);
  const inicio = isMonthKey(body.inicio) ? body.inicio : currentMonthKey();

  if (!descricao) return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 });
  if (!valor) return NextResponse.json({ error: "Informe um valor maior que zero" }, { status: 400 });
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    return NextResponse.json({ error: "Dia de vencimento deve ser de 1 a 31" }, { status: 400 });
  }

  try {
    const cost = await prisma.financeFixedCost.create({
      data: { descricao, valor, diaVencimento: dia, inicio },
    });
    return NextResponse.json({ fixed_cost: fixedToDto(cost) }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar conta fixa:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erro ao criar conta fixa" }, { status: 500 });
  }
}
