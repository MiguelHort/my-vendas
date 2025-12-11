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

    // --------- NORMALIZAÇÃO DO USER (inclui admin) ---------
    const createdAt =
      user.createdAt instanceof Date
        ? user.createdAt
        : new Date(user.createdAt);

    const safeUser = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      admin: user.admin, // flag de admin
      isActive: user.isActive,
      subscriptionStatus: user.subscriptionStatus,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      createdAt,
      updatedAt: user.updatedAt,
    };
    
    // --------- LÓGICA DE TRIAL + ASSINATURA ---------
    const now = new Date();

    // Trial de 7 dias a partir da criação do usuário
    const trialEndsAt = new Date(createdAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const hasActiveSubscription = user.isActive === true;

    const trialActive =
      !hasActiveSubscription && trialEndsAt.getTime() > now.getTime();

    const msLeft = trialEndsAt.getTime() - now.getTime();
    const trialDaysLeft =
      trialActive && msLeft > 0
        ? Math.ceil(msLeft / (1000 * 60 * 60 * 24))
        : 0;

    const canUseApp = hasActiveSubscription || trialActive;

    // Se NÃO pode usar o app (trial expirado e sem assinatura)
    if (!canUseApp) {
      return NextResponse.json(
        {
          ok: false,
          reason: "trial-expired",
          user: safeUser,
          hasActiveSubscription,
          trialActive: false,
          trialEndsAt,
          trialDaysLeft: 0,
        },
        { status: 402 } // Payment Required (sem quebrar o AuthGuard)
      );
    }

    // Se chegou aqui, usuário pode usar o app (trial ou assinatura)
    return NextResponse.json(
      {
        ok: true,
        user: safeUser,
        hasActiveSubscription,
        trialActive,
        trialEndsAt,
        trialDaysLeft,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Erro em /api/me:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
