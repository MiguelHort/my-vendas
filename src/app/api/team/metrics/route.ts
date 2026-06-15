import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function periodCutoff(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "7-dias":    { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case "15-dias":   { const d = new Date(now); d.setDate(d.getDate() - 15); return d; }
    case "este-mes":  return new Date(now.getFullYear(), now.getMonth(), 1);
    case "3-meses":   { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    default:          return null;
  }
}

// Rota acessível por corretores — retorna dados limitados do time (sem comissões individuais)
export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const token = authorization.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);

    const me = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!me) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    // broker deve ter vínculo ativo
    const myLink = await prisma.supervisorBrokerLink.findFirst({
      where: { brokerId: me.id, status: "ACTIVE", removedAt: null },
      select: { supervisorId: true },
    });
    if (!myLink) return NextResponse.json({ error: "Você não está em uma equipe ativa." }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? "este-mes";
    const cutoff = periodCutoff(period);

    const { supervisorId } = myLink;

    // todos os membros do time (supervisor + corretores ativos)
    const links = await prisma.supervisorBrokerLink.findMany({
      where: { supervisorId, status: "ACTIVE", removedAt: null },
      include: { broker: { select: { id: true, name: true, email: true } } },
    });
    const supervisor = await prisma.user.findUnique({
      where: { id: supervisorId },
      select: { id: true, name: true, email: true },
    });

    const allMembers = [
      ...(supervisor ? [{ id: supervisor.id, name: supervisor.name, email: supervisor.email ?? "" }] : []),
      ...links.map((l) => ({ id: l.broker.id, name: l.broker.name, email: l.broker.email })),
    ];

    const allLeads = await prisma.lead.findMany({
      where: { userId: { in: allMembers.map((m) => m.id) } },
      select: { userId: true, status: true, dataVenda: true, dataEntrada: true },
    });

    const teamByStatus: Record<string, number> = {};
    let teamTotalLeads = 0;

    const ranking = allMembers.map((member) => {
      const memberLeads = allLeads.filter((l) => l.userId === member.id);

      // total de leads (sem filtro de data)
      teamTotalLeads += memberLeads.length;
      for (const lead of memberLeads) {
        teamByStatus[lead.status] = (teamByStatus[lead.status] || 0) + 1;
      }

      // vendas no período (filtra por dataVenda)
      const vendas = memberLeads.filter(
        (l) =>
          l.status === "Concluído" &&
          (!cutoff || (l.dataVenda != null && l.dataVenda >= cutoff))
      ).length;

      // total de leads para conversão (usa dataEntrada se cutoff, senão tudo)
      const leadsNoPeriodo = cutoff
        ? memberLeads.filter((l) => l.dataEntrada >= cutoff).length
        : memberLeads.length;

      const conversionRate =
        leadsNoPeriodo > 0 ? Math.round((vendas / leadsNoPeriodo) * 1000) / 10 : 0;

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        vendas,
        conversionRate,
      };
    });

    // totais de vendas no período
    const teamTotalVendas = ranking.reduce((acc, m) => acc + m.vendas, 0);
    const avgConversionRate =
      ranking.length > 0
        ? Math.round((ranking.reduce((a, m) => a + m.conversionRate, 0) / ranking.length) * 10) / 10
        : 0;

    // ordena ranking por vendas desc
    ranking.sort((a, b) => b.vendas - a.vendas);

    return NextResponse.json({
      period,
      team: {
        totalLeads: teamTotalLeads,
        totalVendas: teamTotalVendas,
        avgConversionRate,
        byStatus: teamByStatus,
      },
      ranking,
    });
  } catch (err) {
    console.error("Erro em /api/team/metrics:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
