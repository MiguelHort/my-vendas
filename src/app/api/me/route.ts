import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin"; // ADMIN SDK
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "");

    // Decodifica o token do Firebase no backend
    const decoded = await firebaseAdmin.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    // 👇 Aqui você verifica a assinatura do usuário
    if (!user.isActive) {
      return NextResponse.json({ ok: false, reason: "no-subscription" });
    }

    return NextResponse.json({ ok: true, user });
  } catch (err) {
    console.error("Erro em /api/me:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}