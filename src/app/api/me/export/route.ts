import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization) return NextResponse.json({ ok: false }, { status: 401 });

    const token = authorization.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      include: {
        planCommissions: true,
      },
    });

    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        role: user.role,
      },
      comissoes: user.planCommissions,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="meus-dados-winleads-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    console.error("Erro em GET /api/me/export:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
