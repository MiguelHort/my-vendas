import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authServer";
import { verifyFirebasePassword } from "@/lib/firebaseAuthRest";
import { parseMoney } from "@/lib/finance";
import { entryToDto } from "@/lib/financeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const data: Prisma.FinanceEntryUpdateInput = {};

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
  if (body.data !== undefined) {
    if (typeof body.data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.data)) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }
    data.data = new Date(`${body.data}T00:00:00.000Z`);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  try {
    const entry = await prisma.financeEntry.update({ where: { id }, data });
    return NextResponse.json({ entry: entryToDto(entry) });
  } catch {
    return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
  }
}

/** Exclusão exige a senha da própria conta (mesmo padrão de excluir demanda/conversa). */
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
    await prisma.financeEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
  }
}
