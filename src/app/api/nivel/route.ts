import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const firebaseUid = searchParams.get("firebaseUid");
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  try {
    await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const agg = await prisma.lead.aggregate({
      where: {
        status: "Concluído",
        OR: [
          { dataVenda: { gte: firstDay, lte: lastDay } },
          { dataVenda: null, updatedAt: { gte: firstDay, lte: lastDay } },
        ],
      },
      _sum: { valorComissao: true },
    });

    return NextResponse.json({
      lastMonthCommission: Number(agg._sum.valorComissao ?? 0),
      referenceMonth: firstDay.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao calcular nível" },
      { status: 500 }
    );
  }
}
