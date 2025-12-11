// app/api/cotacoes/plano-saude/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";
import {
  gerarCotacaoPlanoSaude,
  CotacaoPlanoSaudeInput,
} from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // --- autenticação Firebase (igual rota de checkout) ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = await firebaseAdmin.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    // Se quiser, aqui dá pra conferir user no Prisma
    // const user = await prisma.user.findUnique({ where: { firebaseUid } });

    const body = (await req.json()) as Partial<CotacaoPlanoSaudeInput>;

    const faixasEtarias = body.faixasEtarias ?? {};

    const totalVidas = Object.values(faixasEtarias).reduce(
      (acc, val) => acc + (Number(val) || 0),
      0
    );

    // validação básica
    if (
      !body.nome ||
      !body.cidade ||
      !body.estado ||
      !body.tipoPlano ||
      !body.acomodacao ||
      !body.coparticipacao ||
      totalVidas <= 0
    ) {
      return NextResponse.json(
        { error: "Dados incompletos da cotação (verifique faixas etárias)." },
        { status: 400 }
      );
    }

    const input: CotacaoPlanoSaudeInput = {
      nome: body.nome,
      cidade: body.cidade,
      estado: body.estado,
      tipoPlano: body.tipoPlano,
      acomodacao: body.acomodacao,
      coparticipacao: body.coparticipacao,
      observacoes: body.observacoes ?? "",
      faixasEtarias: Object.fromEntries(
        Object.entries(faixasEtarias).map(([k, v]) => [k, Number(v) || 0])
      ),
    };

    const cotacao = await gerarCotacaoPlanoSaude(input);

    // retorna JSON estruturado (planos, observacoesGerais)
    return NextResponse.json(cotacao);
  } catch (error) {
    console.error("Erro ao gerar cotação:", error);
    return NextResponse.json(
      { error: "Erro ao gerar cotação de plano de saúde" },
      { status: 500 }
    );
  }
}
