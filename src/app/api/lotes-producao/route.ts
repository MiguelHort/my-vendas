// app/api/lotes-producao/route.ts
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

    const lotes = await prisma.loteProducao.findMany({
      where: { userId: user.id },
      orderBy: { dataAcao: "desc" },
    });

    const payload = lotes.map((lote) => ({
      id: lote.id,
      data_acao: lote.dataAcao.toISOString(),
      estado_regiao: lote.estadoRegiao,
      volume_total_chamado: lote.volumeTotalChamado,
    }));

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao carregar lotes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const firebaseUid = searchParams.get("firebaseUid");
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  if (!firebaseUid || !email) {
    return NextResponse.json(
      { error: "Usuário inválido" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);

  if (!body || !body.estado_regiao) {
    return NextResponse.json(
      { error: "Dados inválidos para lote" },
      { status: 400 }
    );
  }

  const {
    volume_total_chamado,
    qtd_ligacao,
    qtd_leads_novos,
    qtd_retrabalhos,
    qtd_indicacao,
    qtd_presencial,
    estado_regiao,
    observacoes,
  } = body;

  try {
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    const lote = await prisma.loteProducao.create({
      data: {
        userId: user.id,
        dataAcao: new Date(),
        volumeTotalChamado: Number(volume_total_chamado || 0),
        estadoRegiao: estado_regiao,
        observacoes: observacoes || null,
        qtdLigacao: Number(qtd_ligacao || 0),
        qtdLeadsNovos: Number(qtd_leads_novos || 0),
        qtdRetrabalhos: Number(qtd_retrabalhos || 0),
        qtdIndicacao: Number(qtd_indicacao || 0),
        qtdPresencial: Number(qtd_presencial || 0),
      },
    });

    const payload = {
      id: lote.id,
      data_acao: lote.dataAcao.toISOString(),
      estado_regiao: lote.estadoRegiao,
      volume_total_chamado: lote.volumeTotalChamado,
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao criar lote" },
      { status: 500 }
    );
  }
}
