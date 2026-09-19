import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authServer";
import { verifyFirebasePassword } from "@/lib/firebaseAuthRest";
import { isMonthKey, parseMoney } from "@/lib/finance";
import { fixedToDto } from "@/lib/financeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Edita a conta fixa. `fim` ("YYYY-MM") encerra a conta a partir do mês seguinte,
 * preservando o histórico dos meses anteriores; `fim: null` reabre.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  const data: Prisma.FinanceFixedCostUpdateInput = {};

  if (typeof body.descricao === "string") {
    const descricao = body.descricao.trim();
    if (!descricao) return NextResponse.json({ error: "Descrição não pode ficar vazia" }, { status: 400 });
    data.descricao = descricao;
  }
  if (body.valor !== undefined) {
    const valor = parseMoney(body.valor);
    if (!valor) return NextResponse.json({ error: "Informe um valor maior que zero" }, { status: 400 });
    data.valor = valor;
  }
  if (body.dia_vencimento !== undefined) {
    const dia = Number(body.dia_vencimento);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      return NextResponse.json({ error: "Dia de vencimento deve ser de 1 a 31" }, { status: 400 });
    }
    data.diaVencimento = dia;
  }
  if (body.fim !== undefined) {
    if (body.fim !== null && !isMonthKey(body.fim)) {
      return NextResponse.json({ error: "Mês final inválido" }, { status: 400 });
    }
    data.fim = body.fim;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  try {
    const cost = await prisma.financeFixedCost.update({ where: { id }, data });
    return NextResponse.json({ fixed_cost: fixedToDto(cost) });
  } catch {
    return NextResponse.json({ error: "Conta fixa não encontrada" }, { status: 404 });
  }
}

/** Apaga a conta de todos os meses (inclusive o histórico) — exige a senha da conta. */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const password = body?.password as string | undefined;
  if (!password) return NextResponse.json({ error: "Senha é obrigatória" }, { status: 400 });

  try {
    if (!(await verifyFirebasePassword(auth.user.email, password))) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }
  } catch (err) {
    console.error("Erro ao validar senha:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao validar senha" },
      { status: 500 }
    );
  }

  try {
    await prisma.financeFixedCost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Conta fixa não encontrada" }, { status: 404 });
  }
}
