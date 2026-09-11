import { prisma } from "@/lib/prisma";
import { phoneSuffix } from "@/lib/leadMatch";
import { Q1_QTD_VIDAS } from "./definition";
import type { QuizAnswer, NecessidadePrincipal } from "./types";

export type QuizCompletePayload = {
  conversationId: string;
  waId: string;
  leadId: string | null;
  temPlanoAtual: boolean | null;
  necessidadePrincipal: NecessidadePrincipal | null;
  answers: QuizAnswer[];
};

/**
 * Único ponto de extensão chamado uma vez quando o quiz é concluído.
 *
 * Ligação com o CRM (aprovada): preenche no lead vinculado os campos que o quiz
 * responde — `qtd_vidas` (bucket da q1), `possui_cnpj` (q2) e `tem_plano_anterior`
 * (= tem_plano_atual). Se um dia houver fila de atendimento, é aqui que ela seria
 * notificada.
 *
 * LGPD: as respostas contêm dado de saúde — nada de conteúdo de resposta em log.
 */
export async function aoConcluirQuiz(payload: QuizCompletePayload): Promise<void> {
  const { conversationId, waId, answers } = payload;

  const answerFor = (step: string) => answers.find((a) => a.step === step)?.optionId ?? null;

  const q1 = answerFor("q1");
  const q2 = answerFor("q2");

  const data: {
    qtdVidas?: number;
    possuiCnpj?: boolean;
    temPlanoAnterior?: boolean;
  } = {};

  if (q1 && Q1_QTD_VIDAS[q1] !== undefined) data.qtdVidas = Q1_QTD_VIDAS[q1];
  if (q2 === "q2_sim") data.possuiCnpj = true;
  else if (q2 === "q2_nao") data.possuiCnpj = false;
  if (payload.temPlanoAtual !== null) data.temPlanoAnterior = payload.temPlanoAtual;

  if (Object.keys(data).length === 0) {
    console.info(`[quiz] concluído (conversa ${conversationId}) — sem campos pra atualizar no lead`);
    return;
  }

  // Acha o lead: pelo id gravado no estado, senão casa por telefone.
  let leadId = payload.leadId;
  if (!leadId) {
    const suffix = phoneSuffix(waId);
    if (suffix) {
      const candidates = await prisma.lead.findMany({
        where: { telefone: { not: null } },
        select: { id: true, telefone: true },
        orderBy: { createdAt: "desc" },
      });
      leadId = candidates.find((l) => phoneSuffix(l.telefone) === suffix)?.id ?? null;
    }
  }

  if (!leadId) {
    console.warn(`[quiz] concluído (conversa ${conversationId}) — nenhum lead encontrado pra atualizar`);
    return;
  }

  try {
    await prisma.lead.update({ where: { id: leadId }, data });
    console.info(
      `[quiz] concluído (conversa ${conversationId}) — lead ${leadId} atualizado: ${Object.keys(data).join(", ")}`
    );
  } catch (err) {
    console.error(
      `[quiz] concluído (conversa ${conversationId}) — falha ao atualizar lead ${leadId}:`,
      err instanceof Error ? err.message : err
    );
  }
}
