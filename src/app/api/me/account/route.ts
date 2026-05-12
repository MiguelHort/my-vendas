import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization) return NextResponse.json({ ok: false }, { status: 401 });

    const token = authorization.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);

    const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    // Apaga o usuário em cascata (Prisma cuida das relações com onDelete: Cascade)
    await prisma.user.delete({ where: { id: user.id } });

    // Revoga todos os tokens Firebase do usuário
    await firebaseAdmin.revokeRefreshTokens(decoded.uid);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro em DELETE /api/me/account:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
