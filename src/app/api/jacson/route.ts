import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `Você é Will, o assistente de IA do WinLeads, um CRM para corretores de planos de saúde.
Seu papel é ajudar o corretor a entender sua performance e dados da conta de forma clara e direta.

Você receberá os dados reais da conta do corretor: estatísticas gerais E a lista completa dos leads.
Use esses dados para responder perguntas tanto gerais ("quantas vendas tive?") quanto específicas ("por que o lead João foi dispensado?").

Seja amigável, direto e profissional. Responda sempre em português brasileiro.
Quando mencionar valores monetários, formate como "R$ X.XXX,XX".
Quando não souber a resposta com base nos dados disponíveis, diga honestamente. Nunca invente informações.
Mantenha respostas concisas — 2 a 4 parágrafos no máximo, a menos que o usuário peça detalhes.`;

type LeadRow = {
  nome: string;
  status: string;
  origem: string;
  estado: string | null;
  cidade: string | null;
  dataEntrada: Date;
  dataVenda: Date | null;
  valorComissao: number | null;
  operadoraOfertada: string | null;
  motivoDispensa: string | null;
  modalidade: string | null;
  acomodacao: string | null;
  qtdVidas: number;
  tipoComissao: string;
};

function formatLeadLine(lead: LeadRow): string {
  const parts: string[] = [`[${lead.nome}]`];
  parts.push(`Status: ${lead.status}`);
  parts.push(`Origem: ${lead.origem}`);
  if (lead.estado) parts.push(`Estado: ${lead.estado}${lead.cidade ? `/${lead.cidade}` : ""}`);
  parts.push(`Entrada: ${lead.dataEntrada.toLocaleDateString("pt-BR")}`);
  if (lead.dataVenda) parts.push(`Venda: ${lead.dataVenda.toLocaleDateString("pt-BR")}`);
  if (lead.valorComissao != null)
    parts.push(
      `Comissão: R$ ${lead.valorComissao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    );
  if (lead.operadoraOfertada) parts.push(`Operadora: ${lead.operadoraOfertada}`);
  if (lead.modalidade) parts.push(`Modalidade: ${lead.modalidade}`);
  if (lead.acomodacao) parts.push(`Acomodação: ${lead.acomodacao}`);
  if (lead.qtdVidas > 0) parts.push(`Vidas: ${lead.qtdVidas}`);
  if (lead.motivoDispensa) parts.push(`Motivo dispensa: ${lead.motivoDispensa}`);
  return parts.join(" | ");
}

function buildAccountContext(
  userName: string,
  totalLeads: number,
  leadsByStatus: { status: string; count: number }[],
  leadsThisMonth: number,
  leadsLastMonth: number,
  salesThisMonth: { valorComissao: number | null; operadoraOfertada: string | null }[],
  salesLastMonth: { valorComissao: number | null; operadoraOfertada: string | null }[],
  leadsByOrigin: { origem: string; count: number }[],
  leadsByState: { estado: string | null; count: number }[],
  allLeads: LeadRow[],
  today: Date
): string {
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const thisMonthName = `${monthNames[today.getMonth()]}/${today.getFullYear()}`;
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthName = `${monthNames[lastMonthDate.getMonth()]}/${lastMonthDate.getFullYear()}`;

  const commissionThisMonth = salesThisMonth.reduce((s, l) => s + (l.valorComissao ?? 0), 0);
  const commissionLastMonth = salesLastMonth.reduce((s, l) => s + (l.valorComissao ?? 0), 0);

  const statusLines = leadsByStatus.map((s) => `  - ${s.status}: ${s.count} leads`).join("\n");
  const originLines = leadsByOrigin.map((o) => `  - ${o.origem}: ${o.count} leads`).join("\n");
  const stateLines = leadsByState
    .filter((s) => s.estado)
    .map((s) => `  - ${s.estado}: ${s.count} leads`)
    .join("\n");

  const operatorsSoldThisMonth = salesThisMonth
    .filter((s) => s.operadoraOfertada)
    .reduce<Record<string, number>>((acc, s) => {
      const op = s.operadoraOfertada!;
      acc[op] = (acc[op] ?? 0) + 1;
      return acc;
    }, {});
  const operatorLines = Object.entries(operatorsSoldThisMonth)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([op, count]) => `  - ${op}: ${count} venda(s)`)
    .join("\n");

  const leadsSection =
    allLeads.length > 0
      ? `\n=== LISTA COMPLETA DE LEADS (${allLeads.length} leads, mais recentes primeiro) ===\n` +
      allLeads.map(formatLeadLine).join("\n") +
      "\n=== FIM DOS LEADS ==="
      : "";

  return `=== DADOS DA CONTA DO CORRETOR ===
Corretor: ${userName}
Data atual: ${today.toLocaleDateString("pt-BR")}

RESUMO DE LEADS:
- Total de leads: ${totalLeads}
- Leads por status:
${statusLines || "  (nenhum dado)"}

PRODUÇÃO MENSAL:
- Leads cadastrados em ${thisMonthName}: ${leadsThisMonth}
- Leads cadastrados em ${lastMonthName}: ${leadsLastMonth}

VENDAS (leads com data de venda registrada):
- Vendas em ${thisMonthName}: ${salesThisMonth.length}
- Comissão em ${thisMonthName}: R$ ${commissionThisMonth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Vendas em ${lastMonthName}: ${salesLastMonth.length}
- Comissão em ${lastMonthName}: R$ ${commissionLastMonth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
${operatorLines ? `- Operadoras vendidas em ${thisMonthName}:\n${operatorLines}` : ""}

ORIGENS DE LEADS (top 5):
${originLines || "  (nenhum dado)"}

ESTADOS COM MAIS LEADS (top 5):
${stateLines || "  (nenhum dado)"}
=== FIM DO RESUMO ===${leadsSection}`;
}

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const { message, history = [] }: { message: string; history: ChatMessage[] } =
      await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }

    const today = new Date();
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    const [
      totalLeads,
      leadsByStatusRaw,
      leadsThisMonth,
      leadsLastMonth,
      salesThisMonthRaw,
      salesLastMonthRaw,
      leadsByOriginRaw,
      leadsByStateRaw,
      allLeadsRaw,
    ] = await Promise.all([
      prisma.lead.count({ where: { userId: user.id } }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.lead.count({
        where: { userId: user.id, dataEntrada: { gte: startOfThisMonth } },
      }),
      prisma.lead.count({
        where: { userId: user.id, dataEntrada: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      prisma.lead.findMany({
        where: { userId: user.id, dataVenda: { gte: startOfThisMonth } },
        select: { valorComissao: true, operadoraOfertada: true },
      }),
      prisma.lead.findMany({
        where: { userId: user.id, dataVenda: { gte: startOfLastMonth, lte: endOfLastMonth } },
        select: { valorComissao: true, operadoraOfertada: true },
      }),
      prisma.lead.groupBy({
        by: ["origem"],
        where: { userId: user.id },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.lead.groupBy({
        by: ["estado"],
        where: { userId: user.id },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.lead.findMany({
        where: { userId: user.id },
        select: {
          nome: true,
          status: true,
          origem: true,
          estado: true,
          cidade: true,
          dataEntrada: true,
          dataVenda: true,
          valorComissao: true,
          operadoraOfertada: true,
          motivoDispensa: true,
          modalidade: true,
          acomodacao: true,
          qtdVidas: true,
          tipoComissao: true,
        },
        orderBy: { dataEntrada: "desc" },
        take: 400,
      }),
    ]);

    const leadsByStatus = leadsByStatusRaw.map((r) => ({ status: r.status, count: r._count.id }));
    const leadsByOrigin = leadsByOriginRaw.map((r) => ({ origem: r.origem, count: r._count.id }));
    const leadsByState = leadsByStateRaw.map((r) => ({ estado: r.estado, count: r._count.id }));
    const salesThisMonth = salesThisMonthRaw.map((r) => ({
      valorComissao: r.valorComissao ? Number(r.valorComissao) : null,
      operadoraOfertada: r.operadoraOfertada,
    }));
    const salesLastMonth = salesLastMonthRaw.map((r) => ({
      valorComissao: r.valorComissao ? Number(r.valorComissao) : null,
      operadoraOfertada: r.operadoraOfertada,
    }));
    const allLeads: LeadRow[] = allLeadsRaw.map((r) => ({
      nome: r.nome,
      status: r.status,
      origem: r.origem,
      estado: r.estado,
      cidade: r.cidade,
      dataEntrada: r.dataEntrada,
      dataVenda: r.dataVenda,
      valorComissao: r.valorComissao ? Number(r.valorComissao) : null,
      operadoraOfertada: r.operadoraOfertada,
      motivoDispensa: r.motivoDispensa,
      modalidade: r.modalidade,
      acomodacao: r.acomodacao,
      qtdVidas: r.qtdVidas,
      tipoComissao: r.tipoComissao,
    }));

    const accountContext = buildAccountContext(
      user.name ?? "Corretor",
      totalLeads,
      leadsByStatus,
      leadsThisMonth,
      leadsLastMonth,
      salesThisMonth,
      salesLastMonth,
      leadsByOrigin,
      leadsByState,
      allLeads,
      today
    );

    const historyText =
      history.length > 0
        ? "\n\n=== HISTÓRICO DA CONVERSA ===\n" +
        history
          .slice(-10)
          .map((m) => `${m.role === "user" ? "Corretor" : "Will"}: ${m.content}`)
          .join("\n") +
        "\n=== FIM DO HISTÓRICO ==="
        : "";

    const fullPrompt = `${SYSTEM_PROMPT}\n\n${accountContext}${historyText}\n\nCorretor: ${message}\nWill:`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text().trim();

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Erro em /api/Will:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
