import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSupervisor(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  if (!authorization) return null;
  const token = authorization.replace("Bearer ", "").trim();
  const decoded = await firebaseAdmin.verifyIdToken(token).catch(() => null);
  if (!decoded) return null;
  const me = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
  if (!me?.isSupervisor) return null;
  return me;
}

// GET — retorna metas de todos os membros do time
export async function GET(req: NextRequest) {
  try {
    const me = await getSupervisor(req);
    if (!me) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

    const goals = await prisma.memberGoal.findMany({
      where: { supervisorId: me.id },
    });

    const map: Record<string, number> = {};
    for (const g of goals) map[g.brokerId] = Number(g.targetAmount);

    return NextResponse.json({ goals: map });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT — define/atualiza meta de um membro
export async function PUT(req: NextRequest) {
  try {
    const me = await getSupervisor(req);
    if (!me) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { brokerId, targetAmount } = body as { brokerId?: string; targetAmount?: number };

    if (!brokerId || typeof targetAmount !== "number" || targetAmount < 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // valida que o broker pertence ao time
    const isSelf = brokerId === me.id;
    if (!isSelf) {
      const link = await prisma.supervisorBrokerLink.findFirst({
        where: { supervisorId: me.id, brokerId, status: "ACTIVE", removedAt: null },
        select: { id: true },
      });
      if (!link) return NextResponse.json({ error: "Membro não encontrado no time" }, { status: 403 });
    }

    await prisma.memberGoal.upsert({
      where: { supervisorId_brokerId: { supervisorId: me.id, brokerId } },
      create: { supervisorId: me.id, brokerId, targetAmount },
      update: { targetAmount },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
