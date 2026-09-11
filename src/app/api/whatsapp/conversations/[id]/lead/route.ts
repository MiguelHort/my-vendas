import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { phoneSuffix } from "@/lib/leadMatch";
import { rotuloPergunta } from "@/lib/quiz/definition";
import type { QuizAnswer } from "@/lib/quiz/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Acha o lead cujo telefone bate com o número da conversa, pra mostrar
 * operadora ofertada / valor da mensalidade / etiquetas no cabeçalho do chat.
 * Também devolve o resultado do quiz de qualificação da conversa (independente
 * do lead), pra exibir no modal de respostas do contato.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  const conversation = await prisma.whatsAppConversation.findUnique({
    where: { id },
    include: { quizState: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const quizState = conversation.quizState;
  const quiz = quizState
    ? {
        status: quizState.status,
        tem_plano_atual: quizState.temPlanoAtual,
        necessidade_principal: quizState.necessidadePrincipal,
        answers: (Array.isArray(quizState.answers) ? quizState.answers : []).map((raw) => {
          const a = raw as unknown as QuizAnswer;
          return {
            step: a.step,
            question: rotuloPergunta(a.step),
            answer: a.optionTitle,
            at: a.at,
          };
        }),
      }
    : null;

  const waSuffix = phoneSuffix(conversation.waId);

  const candidates = await prisma.lead.findMany({
    where: { telefone: { not: null } },
    select: {
      id: true,
      status: true,
      operadoraOfertada: true,
      valorMensalidade: true,
      telefone: true,
      tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const match = waSuffix
    ? candidates.find((l) => phoneSuffix(l.telefone) === waSuffix)
    : undefined;

  if (!match) {
    return NextResponse.json({ lead: null, quiz });
  }

  return NextResponse.json({
    lead: {
      id: match.id,
      status: match.status,
      operadora_ofertada: match.operadoraOfertada,
      valor_mensalidade: match.valorMensalidade != null ? Number(match.valorMensalidade) : null,
      tags: match.tags.map((r) => ({ id: r.tag.id, name: r.tag.name, color: r.tag.color })),
    },
    quiz,
  });
}
