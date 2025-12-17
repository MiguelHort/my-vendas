import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const me = auth.user;

  if (!me.isSupervisor) {
    return NextResponse.json({ error: "Você não é supervisor." }, { status: 403 });
  }

  const links = await prisma.supervisorBrokerLink.findMany({
    where: {
      supervisorId: me.id,
      removedAt: null,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      broker: { select: { id: true, name: true, email: true, createdAt: true } },
    },
  });

  return NextResponse.json({ supervisorCode: me.supervisorCode, links });
}
