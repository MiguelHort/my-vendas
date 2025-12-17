import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action = "APPROVE" | "REJECT" | "REMOVE";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const me = auth.user;

  if (!me.isSupervisor) return NextResponse.json({ error: "Você não é supervisor." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const action = body?.action as Action | undefined;
  const linkId = body?.linkId as string | undefined;

  if (!action || !linkId) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });

  const link = await prisma.supervisorBrokerLink.findUnique({
    where: { id: linkId },
    select: { id: true, supervisorId: true, brokerId: true, status: true, removedAt: true },
  });

  if (!link || link.supervisorId !== me.id) return NextResponse.json({ error: "Link não encontrado." }, { status: 404 });
  if (link.removedAt) return NextResponse.json({ error: "Link já removido." }, { status: 400 });

  // Um broker só pode ter 1 supervisor (brokerId é unique)
  if (action === "APPROVE") {
    const updated = await prisma.supervisorBrokerLink.update({
      where: { id: link.id },
      data: { status: "ACTIVE", approvedAt: new Date(), rejectedAt: null },
    });
    return NextResponse.json({ ok: true, updated });
  }

  if (action === "REJECT") {
    const updated = await prisma.supervisorBrokerLink.update({
      where: { id: link.id },
      data: { status: "REJECTED", rejectedAt: new Date() },
    });
    return NextResponse.json({ ok: true, updated });
  }

  // REMOVE: remove da equipe (se estava ativo, vira “desvinculado”)
  if (action === "REMOVE") {
    const updated = await prisma.supervisorBrokerLink.update({
      where: { id: link.id },
      data: { removedAt: new Date() },
    });
    return NextResponse.json({ ok: true, updated });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
