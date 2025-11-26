// app/api/leads/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
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
  if (!body || !body.id) {
    return NextResponse.json(
      { error: "ID do lead é obrigatório" },
      { status: 400 }
    );
  }

  const {
    id,
    nome,
    origem,
    estado,
    cidade,
    telefone,
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
  } = body;

  try {
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    const data: any = {};

    if (nome !== undefined) data.nome = nome;
    if (origem !== undefined) data.origem = origem;
    if (estado !== undefined) data.estado = estado;
    if (cidade !== undefined) data.cidade = cidade;
    if (telefone !== undefined) data.telefone = telefone;
    if (qtd_vidas !== undefined) data.qtdVidas = Number(qtd_vidas);
    if (idades !== undefined) data.idades = idades;
    if (possui_cnpj !== undefined) data.possuiCnpj = !!possui_cnpj;
    if (tem_plano_anterior !== undefined)
      data.temPlanoAnterior = !!tem_plano_anterior;
    if (operadora_anterior !== undefined)
      data.operadoraAnterior = operadora_anterior;
    if (tempo_plano_anterior !== undefined)
      data.tempoPlanoAnterior = tempo_plano_anterior;
    if (modalidade !== undefined) data.modalidade = modalidade;
    if (operadora_ofertada !== undefined)
      data.operadoraOfertada = operadora_ofertada;
    if (acomodacao !== undefined) data.acomodacao = acomodacao;
    if (valor_mensalidade !== undefined)
      data.valorMensalidade =
        valor_mensalidade !== null
          ? Number(valor_mensalidade)
          : null;
    if (coparticipacao !== undefined)
      data.coparticipacao = coparticipacao;

    await prisma.lead.update({
      where: {
        id,
        userId: user.id,
      },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao atualizar lead" },
      { status: 500 }
    );
  }
}
