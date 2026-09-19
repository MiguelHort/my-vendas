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
    valor_comissao,
    data_entrada,
    data_venda,
    data_pagamento_comissao,
    last_chamado_at,
    retornar_em,
  } = body;

  try {
    await getOrCreateUserByFirebaseUid({
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
    if (valor_comissao !== undefined)
      data.valorComissao =
        valor_comissao !== null ? Number(valor_comissao) : null;
    if (data_entrada !== undefined) data.dataEntrada = new Date(data_entrada);
    if (data_venda !== undefined) data.dataVenda = data_venda;
    if (data_pagamento_comissao !== undefined)
      data.dataPagamentoComissao = data_pagamento_comissao
        ? new Date(data_pagamento_comissao)
        : null;
    if (last_chamado_at !== undefined)
      data.lastChamadoAt = last_chamado_at;
    if (retornar_em !== undefined)
      data.retornarEm = retornar_em ? new Date(retornar_em) : null;

    const updated = await prisma.lead.update({
      where: { id },
      data,
    });

    // Entrada financeira já lançada dessa venda acompanha a data/valor da comissão.
    if (
      data_venda !== undefined ||
      data_pagamento_comissao !== undefined ||
      valor_comissao !== undefined
    ) {
      const efetiva = updated.dataPagamentoComissao ?? updated.dataVenda;
      const patch: { data?: Date; valor?: number } = {};
      if (efetiva) patch.data = new Date(efetiva.toISOString().slice(0, 10) + "T00:00:00.000Z");
      if (updated.valorComissao && Number(updated.valorComissao) > 0)
        patch.valor = Number(updated.valorComissao);
      if (Object.keys(patch).length > 0) {
        await prisma.financeEntry.updateMany({ where: { leadId: id }, data: patch });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao atualizar lead" },
      { status: 500 }
    );
  }
}
