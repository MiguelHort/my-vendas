import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";
import type { Lead } from "@prisma/client";

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

    const leads: Lead[] = await prisma.lead.findMany({
      where: { userId: user.id },
      orderBy: { dataEntrada: "desc" },
    });

    const payload = leads.map((l: Lead) => ({
      id: l.id,
      nome: l.nome,
      origem: l.origem,
      status: l.status,
      data_entrada: l.dataEntrada.toISOString(),
      estado: l.estado ?? "",
      cidade: l.cidade,
      telefone: l.telefone,
      operadora_ofertada: l.operadoraOfertada,
      qtd_vidas: l.qtdVidas,
      idades: l.idades ?? "",
      possui_cnpj: l.possuiCnpj,
      tem_plano_anterior: l.temPlanoAnterior,
      operadora_anterior: l.operadoraAnterior,
      tempo_plano_anterior: l.tempoPlanoAnterior,
      modalidade: l.modalidade,
      acomodacao: l.acomodacao,
      valor_mensalidade: l.valorMensalidade ? Number(l.valorMensalidade) : null,
      coparticipacao: l.coparticipacao,
      motivo_dispensa: l.motivoDispensa,
      updated_at: l.updatedAt.toISOString(),
    }));

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao carregar leads" },
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
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const {
    nome,
    telefone,
    origem,
    estado,
    cidade,
    qtd_vidas,
    idades,
    possui_cnpj,
    tem_plano_anterior,
    operadora_anterior,
    tempo_plano_anterior,
    modalidade,
    operadora_ofertada,
    acomodacao,
    valor_mensalidade,
    coparticipacao,
    status,
    lote_producao_id,
  } = body;

  if (!nome || !origem || !estado || !cidade || !qtd_vidas || !idades) {
    return NextResponse.json(
      { error: "Campos obrigatórios não preenchidos" },
      { status: 400 }
    );
  }

  if (!lote_producao_id) {
    return NextResponse.json(
      { error: "Todo lead precisa estar vinculado a um lote de produção" },
      { status: 400 }
    );
  }

  try {
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    await prisma.lead.create({
      data: {
        nome,
        telefone: telefone || null,
        origem,
        estado,
        cidade,
        qtdVidas: Number(qtd_vidas),
        idades,
        possuiCnpj: possui_cnpj !== null ? !!possui_cnpj : null,
        temPlanoAnterior:
          tem_plano_anterior !== null ? !!tem_plano_anterior : null,
        operadoraAnterior:
          tem_plano_anterior && operadora_anterior
            ? operadora_anterior
            : null,
        tempoPlanoAnterior:
          tem_plano_anterior && tempo_plano_anterior
            ? tempo_plano_anterior
            : null,
        modalidade: modalidade || null,
        operadoraOfertada: operadora_ofertada || null,
        acomodacao: acomodacao || null,
        valorMensalidade:
          valor_mensalidade !== null && valor_mensalidade !== undefined
            ? Number(valor_mensalidade)
            : null,
        coparticipacao: coparticipacao || null,
        status: status || "Abordagem",
        dataEntrada: new Date(),
        userId: user.id,
        loteProducaoId: lote_producao_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao criar lead" },
      { status: 500 }
    );
  }
}
