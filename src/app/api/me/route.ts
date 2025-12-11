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
    
    // Normaliza o que será enviado para o front (pra não mandar tudo do banco cru)
    const safeUser = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      admin: user.admin,               // 👈 AQUI: flag de admin
      isActive: user.isActive,
      subscriptionStatus: user.subscriptionStatus,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // 👇 Aqui você verifica a assinatura do usuário
    if (!user.isActive) {
      // Continua indicando que NÃO tem assinatura,
      // mas agora já devolve o usuário também (incluindo admin)
      return NextResponse.json(
        {
          ok: false,
          reason: "no-subscription",
          user: safeUser,
        },
        { status: 200 }
      );
    }

    // Usuário ativo (pagante / liberado)
    return NextResponse.json(
      {
        ok: true,
        user: safeUser,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Erro em /api/me:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
