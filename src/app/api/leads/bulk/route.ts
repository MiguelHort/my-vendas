import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";

export const runtime = "nodejs";

type LeadInput = {
  nome: string;
  telefone?: string | null;
  origem: string;
  estado: string;
  cidade: string;
  qtd_vidas: number;
  idades: string;
  data_venda?: string | null;
  valor_comissao?: number | null;
  valor_mensalidade?: number | null;
  operadora_ofertada?: string | null;
  modalidade?: string | null;
  tipo_comissao?: string;
};

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const firebaseUid = searchParams.get("firebaseUid");
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.leads || !Array.isArray(body.leads)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const leads: LeadInput[] = body.leads;
  if (leads.length === 0) {
    return NextResponse.json({ error: "Nenhum lead para importar" }, { status: 400 });
  }

  try {
    await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    await prisma.$transaction(
      leads.map((l) =>
        prisma.lead.create({
          data: {
            nome: l.nome,
            telefone: l.telefone || null,
            origem: l.origem || "Lead Novo",
            estado: l.estado || "",
            cidade: l.cidade || "",
            qtdVidas: Number(l.qtd_vidas) || 1,
            idades: l.idades || "",
            status: "Concluído",
            dataEntrada: l.data_venda ? new Date(l.data_venda) : new Date(),
            dataVenda: l.data_venda ? new Date(l.data_venda) : null,
            valorComissao:
              l.valor_comissao != null ? Number(l.valor_comissao) : null,
            valorMensalidade:
              l.valor_mensalidade != null ? Number(l.valor_mensalidade) : null,
            operadoraOfertada: l.operadora_ofertada || null,
            modalidade: l.modalidade || null,
            tipoComissao: l.tipo_comissao || "interno",
          },
        })
      )
    );

    return NextResponse.json({ created: leads.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao salvar leads" }, { status: 500 });
  }
}
