import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization) return NextResponse.json({ ok: false }, { status: 401 });

    const token = authorization.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);

    const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    const body = await req.json();
    const version = body.version ?? "1.0";
    const type = body.type ?? "privacy_and_terms";

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;

    const consent = await prisma.userConsent.create({
      data: {
        userId: user.id,
        type,
        version,
        acceptedAt: new Date(),
        ip,
      },
    });

    return NextResponse.json({ ok: true, consent }, { status: 201 });
  } catch (err) {
    console.error("Erro em POST /api/lgpd/consent:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization");
    if (!authorization) return NextResponse.json({ ok: false }, { status: 401 });

    const token = authorization.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);

    const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
    if (!user) return NextResponse.json({ ok: false }, { status: 404 });

    const consent = await prisma.userConsent.findFirst({
      where: { userId: user.id, type: "privacy_and_terms" },
      orderBy: { acceptedAt: "desc" },
    });

    return NextResponse.json({ ok: true, hasConsented: !!consent, consent });
  } catch (err) {
    console.error("Erro em GET /api/lgpd/consent:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
