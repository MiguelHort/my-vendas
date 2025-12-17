// app/api/supervisor/leads/route.ts
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

    const { searchParams } = new URL(req.url);
    const brokerId = searchParams.get("brokerId");
    if (!brokerId) return NextResponse.json({ error: "brokerId é obrigatório." }, { status: 400 });

    const isSelf = brokerId === me.id;

    if (!isSelf) {
      const link = await prisma.supervisorBrokerLink.findFirst({
        where: {
          supervisorId: me.id,
          brokerId,
          status: "ACTIVE",
          removedAt: null,
        },
        select: { id: true },
      });

      if (!link) {
        return NextResponse.json({ error: "Corretor não pertence ao seu time." }, { status: 403 });
      }
    }

    const leads = await prisma.lead.findMany({
      where: { userId: brokerId },
      orderBy: { dataEntrada: "desc" },
    });

    const payload = leads.map((l) => ({
      id: l.id,
      origem: l.origem,
      status: l.status,
      valor_comissao: l.valorComissao ? Number(l.valorComissao) : null,
      data_entrada: l.dataEntrada ? l.dataEntrada.toISOString() : "",
      estado: l.estado ?? "",
      data_venda: l.dataVenda ? l.dataVenda.toISOString() : null,
      updated_at: l.updatedAt ? l.updatedAt.toISOString() : undefined,
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("Erro em /api/supervisor/leads:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
