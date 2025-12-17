import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, makeSupervisorCode } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const me = auth.user;

  // Se já tem código, só garante isSupervisor=true
  if (me.supervisorCode) {
    const updated = await prisma.user.update({
      where: { id: me.id },
      data: { isSupervisor: true },
      select: { isSupervisor: true, supervisorCode: true },
    });
    return NextResponse.json(updated);
  }

  // Gera código único
  for (let i = 0; i < 10; i++) {
    const code = makeSupervisorCode(6);
    const exists = await prisma.user.findFirst({ where: { supervisorCode: code }, select: { id: true } });
    if (!exists) {
      const updated = await prisma.user.update({
        where: { id: me.id },
        data: { isSupervisor: true, supervisorCode: code },
        select: { isSupervisor: true, supervisorCode: true },
      });
      return NextResponse.json(updated);
    }
  }

  return NextResponse.json({ error: "Não foi possível gerar código, tente novamente." }, { status: 500 });
}
