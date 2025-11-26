// app/api/dashboard/lotes-producao/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const firebaseUid = searchParams.get("firebaseUid");
  const email = searchParams.get("email");
  const name = searchParams.get("name");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!firebaseUid || !email) {
    return NextResponse.json(
      { error: "Usuário inválido" },
      { status: 401 }
    );
  }

  try {
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    let dateFilter: { gte?: Date; lte?: Date } = {};

    if (start) {
      dateFilter.gte = new Date(start);
    }
    if (end) {
      dateFilter.lte = new Date(end);
    }

    const lotes = await prisma.loteProducao.findMany({
      where: {
        userId: user.id,
        ...(start || end
          ? {
              dataAcao: dateFilter,
            }
          : {}),
      },
      select: {
        volumeTotalChamado: true,
        qtdLeadsNovos: true,
        qtdRetrabalhos: true,
        qtdLigacao: true,
        qtdIndicacao: true,
        qtdPresencial: true,
      },
    });

    const payload = lotes.map((l) => ({
      volume_total_chamado: l.volumeTotalChamado,
      qtd_leads_novos: l.qtdLeadsNovos,
      qtd_retrabalhos: l.qtdRetrabalhos,
      qtd_ligacao: l.qtdLigacao,
      qtd_indicacao: l.qtdIndicacao,
      qtd_presencial: l.qtdPresencial,
    }));

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao carregar lotes de produção" },
      { status: 500 }
    );
  }
}
