// app/api/supervisor/brokers/route.ts
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

    if (!me.isSupervisor) {
      return NextResponse.json({ error: "Você não é supervisor." }, { status: 403 });
    }

    const links = await prisma.supervisorBrokerLink.findMany({
      where: {
        supervisorId: me.id,
        status: "ACTIVE",
        removedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        broker: { select: { id: true, name: true, email: true } },
      },
    });

    const brokers = links.map((l) => ({
      id: l.broker.id,
      name: l.broker.name,
      email: l.broker.email,
    }));

    return NextResponse.json({ brokers }, { status: 200 });
  } catch (err) {
    console.error("Erro em /api/supervisor/brokers:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
