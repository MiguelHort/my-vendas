import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authServer";
import {
  ENTRY_TIPOS,
  currentMonthKey,
  fixedCostActiveInMonth,
  isMonthKey,
  monthBounds,
  parseMoney,
  shiftMonth,
} from "@/lib/finance";
import { entryToDto, fixedToDto, isoDay } from "@/lib/financeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lançamentos do mês + contas fixas vigentes + vendas concluídas ainda não lançadas como entrada. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const monthParam = req.nextUrl.searchParams.get("month");
  const month = isMonthKey(monthParam) ? monthParam : currentMonthKey();
  const { start, end } = monthBounds(month);

  const monthStart = new Date(`${start}T00:00:00.000Z`);
  const nextMonthStart = new Date(`${shiftMonth(month, 1)}-01T00:00:00.000Z`);
  const inMonth = { gte: monthStart, lt: nextMonthStart };

  const [entries, fixedCosts, vendas] = await Promise.all([
    prisma.financeEntry.findMany({
      where: {
        data: { gte: new Date(`${start}T00:00:00.000Z`), lte: new Date(`${end}T00:00:00.000Z`) },
      },
      orderBy: [{ data: "desc" }, { createdAt: "desc" }],
    }),
    prisma.financeFixedCost.findMany({ orderBy: [{ diaVencimento: "asc" }, { descricao: "asc" }] }),
    prisma.lead.findMany({
      where: {
        status: "Concluído",
        valorComissao: { gt: 0 },
        // o dinheiro entra no dia do pagamento da comissão; sem essa data (vendas antigas), vale o dia da venda
        OR: [
          { dataPagamentoComissao: inMonth },
          { dataPagamentoComissao: null, dataVenda: inMonth },
        ],
        financeEntries: { none: {} },
      },
      select: {
        id: true,
        nome: true,
        valorComissao: true,
        dataVenda: true,
        dataPagamentoComissao: true,
      },
    }),
  ]);

  const fixedDtos = fixedCosts.map(fixedToDto);

  return NextResponse.json({
    month,
    entries: entries.map(entryToDto),
    fixed_costs: fixedDtos.filter((c) => fixedCostActiveInMonth(c, month)),
    vendas_pendentes: vendas
      .map((v) => {
        const efetiva = v.dataPagamentoComissao ?? v.dataVenda;
        return {
          lead_id: v.id,
          nome: v.nome,
          valor: Number(v.valorComissao),
          data: efetiva ? isoDay(efetiva) : null,
          data_venda: v.dataVenda ? isoDay(v.dataVenda) : null,
          tem_data_pagamento: !!v.dataPagamentoComissao,
          previsto: !!v.dataPagamentoComissao && v.dataPagamentoComissao.getTime() > Date.now(),
        };
      })
      .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")),
  });
}

/**
 * Cria um lançamento. Com `lead_id`, lança a comissão de uma venda concluída
 * como entrada (valor/data/descrição saem da própria venda).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  try {
    if (typeof body.lead_id === "string" && body.lead_id) {
      const lead = await prisma.lead.findUnique({
        where: { id: body.lead_id },
        select: {
          id: true,
          nome: true,
          status: true,
          valorComissao: true,
          dataVenda: true,
          dataPagamentoComissao: true,
        },
      });
      if (!lead || lead.status !== "Concluído") {
        return NextResponse.json({ error: "Venda não encontrada ou não concluída" }, { status: 404 });
      }
      const valor = parseMoney(Number(lead.valorComissao));
      if (!valor) {
        return NextResponse.json({ error: "Essa venda não tem comissão informada" }, { status: 400 });
      }
      const entry = await prisma.financeEntry.create({
        data: {
          tipo: "ENTRADA",
          descricao: `Venda — ${lead.nome}`,
          valor,
          data: new Date(
            `${isoDay(lead.dataPagamentoComissao ?? lead.dataVenda ?? new Date())}T00:00:00.000Z`
          ),
          leadId: lead.id,
        },
      });
      return NextResponse.json({ entry: entryToDto(entry) }, { status: 201 });
    }

    const descricao = typeof body.descricao === "string" ? body.descricao.trim() : "";
    const valor = parseMoney(body.valor);
    const tipo = body.tipo;
    if (!ENTRY_TIPOS.includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    if (!descricao) return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 });
    if (!valor) return NextResponse.json({ error: "Informe um valor maior que zero" }, { status: 400 });
    if (typeof body.data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.data)) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }

    const entry = await prisma.financeEntry.create({
      data: { tipo, descricao, valor, data: new Date(`${body.data}T00:00:00.000Z`) },
    });
    return NextResponse.json({ entry: entryToDto(entry) }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Essa venda já foi lançada" }, { status: 409 });
    }
    console.error("Erro ao criar lançamento:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erro ao criar lançamento" }, { status: 500 });
  }
}
