// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrialStatus = "paid" | "trial" | "blocked";

function getTrialStatus(user: {
  createdAt: Date;
  subscriptionStatus: string | null;
  isActive: boolean;
}): { trialStatus: TrialStatus; trialEndsAt: Date | null } {
  const paidStatuses = ["active", "trialing", "past_due"];

  // Já é considerado "pagante" se tiver assinatura válida OU isActive true
  if (
    (user.subscriptionStatus &&
      paidStatuses.includes(user.subscriptionStatus)) ||
    user.isActive
  ) {
    return { trialStatus: "paid", trialEndsAt: null };
  }

  const createdAt = user.createdAt;
  const trialEndsAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (now < trialEndsAt) {
    return { trialStatus: "trial", trialEndsAt };
  }

  return { trialStatus: "blocked", trialEndsAt };
}

async function ensureAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { error: "Não autenticado", status: 401 as const };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const decoded = await firebaseAdmin.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return { error: "Usuário não encontrado", status: 404 as const };
    }

    if (!user.admin) {
      return { error: "Não autorizado", status: 403 as const };
    }

    return { adminUser: user };
  } catch (err) {
    console.error("Erro em ensureAdmin:", err);
    return { error: "Token inválido", status: 401 as const };
  }
}

export async function GET(req: NextRequest) {
  const authResult = await ensureAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { ok: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    const usersWithStatus = users.map((u) => {
      const { trialStatus, trialEndsAt } = getTrialStatus({
        createdAt: u.createdAt,
        subscriptionStatus: u.subscriptionStatus,
        isActive: u.isActive,
      });

      return {
        id: u.id,
        firebaseUid: u.firebaseUid,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        stripeCustomerId: u.stripeCustomerId,
        stripeSubscriptionId: u.stripeSubscriptionId,
        subscriptionStatus: u.subscriptionStatus,
        isActive: u.isActive,
        admin: u.admin,
        trialStatus,
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      ok: true,
      users: usersWithStatus,
    });
  } catch (err) {
    console.error("Erro em GET /api/admin/users:", err);
    return NextResponse.json(
      { ok: false, error: "Erro ao buscar usuários" },
      { status: 500 }
    );
  }
}