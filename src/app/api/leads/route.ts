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

    const leads = await prisma.lead.findMany({
      where: { userId: user.id },
      orderBy: { dataEntrada: "desc" },
    });

    const payload = leads.map((l: (typeof leads)[number]) => ({
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
      valor_comissao: l.valorComissao ? Number(l.valorComissao) : null,
      data_venda: l.dataVenda ? l.dataVenda.toISOString() : null,
      last_chamado_at: l.lastChamadoAt ? l.lastChamadoAt.toISOString() : null,
      card_color: l.cardColor ?? null,
      notas: l.notas ?? null,
      etiquetas: l.etiquetas ?? null,
      retornar_em: l.retornarEm ? l.retornarEm.toISOString() : null,
    }));

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao carregar leads" },
      { status: 500 },
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
    valor_comissao,
    data_venda,
    last_chamado_at,
    card_color,
    notas,
    etiquetas,
    retornar_em,
  } = body;

  if (!nome || !origem || !estado || !cidade || !qtd_vidas || !idades) {
    return NextResponse.json(
      { error: "Campos obrigatórios não preenchidos" },
      { status: 400 },
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
          tem_plano_anterior && operadora_anterior ? operadora_anterior : null,
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
        valorComissao:
          valor_comissao !== null && valor_comissao !== undefined
            ? Number(valor_comissao)
            : null,
        dataVenda: data_venda ? new Date(data_venda) : null,
        lastChamadoAt: last_chamado_at ? new Date(last_chamado_at) : null,
        cardColor: card_color || null,
        notas: notas || null,
        etiquetas: etiquetas || null,
        retornarEm: retornar_em ? new Date(retornar_em) : null,
      },
    });

    if (origem === "Formulário (Landing)") {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v24.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: process.env.WHATSAPP_NOTIFY_TO,
              type: "template",
              template: {
                name: "new_lead",
                language: { code: "pt_BR" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: nome, parameter_name: "name" },
                      { type: "text", text: telefone || "Não informado", parameter_name: "phone" },
                      { type: "text", text: cidade, parameter_name: "city" },
                      { type: "text", text: estado, parameter_name: "uf" },
                    ],
                  },
                ],
              },
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("❌ WhatsApp API erro:", {
            status: response.status,
            data,
          });
        } else {
          console.log("✅ WhatsApp enviado com sucesso:", data);
        }
      } catch (error) {
        console.error("🔥 Erro inesperado ao enviar WhatsApp:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar lead" }, { status: 500 });
  }
}
