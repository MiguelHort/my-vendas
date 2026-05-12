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

    const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    return NextResponse.json({
      ok: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        subscriptionStatus: user.subscriptionStatus,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error("Erro em GET /api/me/profile:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization) return NextResponse.json({ ok: false }, { status: 401 });

    const token = authorization.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);

    const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : undefined;

    if (!name) return NextResponse.json({ ok: false, message: "Nome inválido." }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name },
    });

    return NextResponse.json({ ok: true, profile: { id: updated.id, name: updated.name, email: updated.email } });
  } catch (err) {
    console.error("Erro em PUT /api/me/profile:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
