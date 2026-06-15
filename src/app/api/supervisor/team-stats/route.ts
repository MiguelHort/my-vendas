import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const token = authorization.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);

    const me = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!me) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if (!me.isSupervisor) return NextResponse.json({ error: "Você não é supervisor." }, { status: 403 });

    const links = await prisma.supervisorBrokerLink.findMany({
      where: { supervisorId: me.id, status: "ACTIVE", removedAt: null },
      include: { broker: { select: { id: true, name: true, email: true } } },
    });

    const allMembers = [
      { id: me.id, name: me.name, email: me.email ?? "", isSelf: true },
      ...links.map((l) => ({ id: l.broker.id, name: l.broker.name, email: l.broker.email, isSelf: false })),
    ];

    const allLeads = await prisma.lead.findMany({
      where: { userId: { in: allMembers.map((m) => m.id) } },
      select: { userId: true, status: true, valorComissao: true, updatedAt: true },
    });

    const members = allMembers.map((member) => {
      const memberLeads = allLeads.filter((l) => l.userId === member.id);
      const byStatus: Record<string, number> = {};
      let totalVendas = 0;
      let totalComissao = 0;
      let lastActivity: Date | null = null;

      for (const lead of memberLeads) {
        byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
        if (lead.status === "Concluído") {
          totalVendas++;
          if (lead.valorComissao) totalComissao += Number(lead.valorComissao);
        }
        if (!lastActivity || lead.updatedAt > lastActivity) lastActivity = lead.updatedAt;
      }

      const totalLeads = memberLeads.length;
      const conversionRate = totalLeads > 0 ? (totalVendas / totalLeads) * 100 : 0;

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        isSelf: member.isSelf,
        totalLeads,
        byStatus,
        totalVendas,
        totalComissao: Math.round(totalComissao * 100) / 100,
        conversionRate: Math.round(conversionRate * 10) / 10,
        lastActivity: lastActivity ? (lastActivity as Date).toISOString() : null,
      };
    });

    const teamByStatus: Record<string, number> = {};
    let teamTotalLeads = 0;
    let teamTotalVendas = 0;
    let teamTotalComissao = 0;

    for (const m of members) {
      teamTotalLeads += m.totalLeads;
      teamTotalVendas += m.totalVendas;
      teamTotalComissao += m.totalComissao;
      for (const [st, count] of Object.entries(m.byStatus)) {
        teamByStatus[st] = (teamByStatus[st] || 0) + count;
      }
    }

    const avgConversionRate =
      members.length > 0
        ? Math.round((members.reduce((acc, m) => acc + m.conversionRate, 0) / members.length) * 10) / 10
        : 0;

    return NextResponse.json({
      members,
      team: {
        totalLeads: teamTotalLeads,
        totalVendas: teamTotalVendas,
        totalComissao: Math.round(teamTotalComissao * 100) / 100,
        avgConversionRate,
        byStatus: teamByStatus,
      },
    });
  } catch (err) {
    console.error("Erro em /api/supervisor/team-stats:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
