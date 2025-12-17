import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const me = auth.user;

  const link = await prisma.supervisorBrokerLink.findUnique({
    where: { brokerId: me.id },
    include: { supervisor: { select: { id: true, name: true, email: true, supervisorCode: true } } },
  });

  return NextResponse.json({ link });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const me = auth.user;

  const body = await req.json().catch(() => null);
  const code = (body?.code as string | undefined)?.trim().toUpperCase();

  if (!code) return NextResponse.json({ error: "Informe o código." }, { status: 400 });

  // já tem link?
  const existing = await prisma.supervisorBrokerLink.findUnique({ where: { brokerId: me.id } });
  if (existing && !existing.removedAt && existing.status !== "REJECTED") {
    return NextResponse.json({ error: "Você já possui uma solicitação ou vínculo ativo." }, { status: 400 });
  }

  const supervisor = await prisma.user.findFirst({
    where: { supervisorCode: code, isSupervisor: true },
    select: { id: true, name: true, email: true },
  });

  if (!supervisor) return NextResponse.json({ error: "Código inválido." }, { status: 404 });
  if (supervisor.id === me.id) return NextResponse.json({ error: "Você não pode usar seu próprio código." }, { status: 400 });

  // se existia link antigo rejeitado/removido, recria limpo
  if (existing) {
    const created = await prisma.supervisorBrokerLink.update({
      where: { brokerId: me.id },
      data: {
        supervisorId: supervisor.id,
        status: "PENDING",
        createdAt: new Date(),
        approvedAt: null,
        rejectedAt: null,
        removedAt: null,
      },
      include: { supervisor: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ ok: true, link: created });
  }

  const created = await prisma.supervisorBrokerLink.create({
    data: {
      supervisorId: supervisor.id,
      brokerId: me.id,
      status: "PENDING",
    },
    include: { supervisor: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ ok: true, link: created });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const me = auth.user;

  const link = await prisma.supervisorBrokerLink.findUnique({ where: { brokerId: me.id } });
  if (!link) return NextResponse.json({ ok: true });

  // cancelar pendente
  if (link.status === "PENDING" && !link.removedAt) {
    await prisma.supervisorBrokerLink.update({
      where: { brokerId: me.id },
      data: { removedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
