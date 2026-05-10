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
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    const agg = await prisma.lead.aggregate({
      where: { userId: user.id, status: "Concluído" },
      _count: { id: true },
      _sum: { valorMensalidade: true, valorComissao: true },
    });

    return NextResponse.json({
      totalVendas: agg._count.id,
      totalValorVendas: Number(agg._sum.valorMensalidade ?? 0),
      totalComissao: Number(agg._sum.valorComissao ?? 0),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao calcular conquistas" },
      { status: 500 }
    );
  }
}
