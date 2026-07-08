// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin"; // ADMIN SDK
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "").trim();

    // Decodifica o token do Firebase no backend
    const decoded = await firebaseAdmin.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const safeUser = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      role: user.role,
      approved: user.approved,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (!user.approved) {
      return NextResponse.json(
        { ok: false, reason: "pending-approval", user: safeUser },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, user: safeUser }, { status: 200 });
  } catch (err) {
    console.error("Erro em /api/me:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
