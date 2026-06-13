import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_COLUMNS = [
  { id: "Dispensado", title: "Dispensado", color: "#6b7280" },
  { id: "Abordagem",  title: "Abordagem",  color: "#3b82f6" },
  { id: "Avaliando",  title: "Avaliando",  color: "#eab308" },
  { id: "Fechamento", title: "Fechamento", color: "#8b5cf6" },
  { id: "Concluído",  title: "Concluído",  color: "#22c55e" },
];

export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const token = authorization.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);

    const me = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!me) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if (!me.isSupervisor) return NextResponse.json({ error: "Você não é supervisor." }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const brokerId = searchParams.get("brokerId");
    if (!brokerId) return NextResponse.json({ error: "brokerId é obrigatório." }, { status: 400 });

    const isSelf = brokerId === me.id;

    if (!isSelf) {
      const link = await prisma.supervisorBrokerLink.findFirst({
        where: { supervisorId: me.id, brokerId, status: "ACTIVE", removedAt: null },
        select: { id: true },
      });
      if (!link) return NextResponse.json({ error: "Corretor não pertence ao seu time." }, { status: 403 });
    }

    const rows = await prisma.funnelColumn.findMany({
      where: { userId: brokerId },
      orderBy: { position: "asc" },
    });

    const columns = rows.length > 0
      ? rows.map((r) => ({ id: r.colId, title: r.title, color: r.color }))
      : DEFAULT_COLUMNS;

    return NextResponse.json({ columns });
  } catch (err) {
    console.error("Erro em /api/supervisor/funnel-columns:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
