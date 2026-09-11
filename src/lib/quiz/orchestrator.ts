import { advance } from "./engine";
import type { QuizCompletePayload } from "./on-complete";
import type { QuizSender } from "./send";
import type { QuizStore } from "./store";
import type { QuizInboundEvent } from "./types";

export type QuizInboundMessage = {
  /** id (wamid) da mensagem recebida — usado pra idempotência. */
  wamid: string;
  /** interactive.button_reply, quando a mensagem é um clique em botão. */
  buttonReply?: { id: string; title: string } | null;
  /** context.id — wamid da mensagem que continha o botão. */
  contextId?: string | null;
};

export type QuizDeps = {
  store: QuizStore;
  sender: QuizSender;
  onComplete: (payload: QuizCompletePayload) => Promise<void>;
  now?: () => Date;
  log?: Pick<Console, "error" | "warn" | "info">;
};

/**
 * Processa uma mensagem recebida para o quiz de qualificação.
 *
 * - Idempotente por `wamid` (dedup dentro da seção crítica).
 * - Seção crítica em série por contato (lock no `store`).
 * - Envio, registro no inbox e ponto de extensão rodam FORA do lock.
 * - Se o envio falhar, o estado (com a resposta já dada) fica salvo e a próxima
 *   mensagem do contato faz a pergunta pendente ser reenviada.
 */
export async function runQuizForInbound(
  input: { waId: string; message: QuizInboundMessage },
  deps: QuizDeps
): Promise<void> {
  const { waId, message } = input;
  const log = deps.log ?? console;

  const decision = await deps.store.runLocked(waId, async (ctx) => {
    if (!ctx.conversationId || !ctx.quiz) return null; // sem conversa / quiz nunca iniciado
    if (ctx.quiz.status !== "EM_ANDAMENTO") return null; // concluído/interrompido: fluxo normal
    if (ctx.quiz.lastInboundWamid === message.wamid) return null; // já processado

    const event: QuizInboundEvent = message.buttonReply
      ? {
          kind: "button_reply",
          id: message.buttonReply.id,
          title: message.buttonReply.title,
          contextId: message.contextId ?? null,
        }
      : { kind: "other" };

    const result = advance(ctx.quiz, event, { now: deps.now });

    await ctx.save({ ...result.state, lastInboundWamid: message.wamid });

    return {
      conversationId: ctx.conversationId,
      leadId: ctx.quiz.leadId,
      result,
    };
  });

  if (!decision) return;

  const { conversationId, result } = decision;

  for (const action of result.outbound) {
    const sent = await deps.sender.send(waId, action);

    if (!sent.ok) {
      log.error(
        `[quiz] falha ao enviar (${action.type}) — conversa ${conversationId}, status=${sent.status}, metaCode=${sent.metaCode}`
      );
      // lastQuestionWamid segue null → a próxima mensagem do contato reenvia.
      continue;
    }

    if (action.type === "send_question") {
      if (sent.wamid) {
        await deps.store.setLastQuestionWamid(conversationId, sent.wamid);
      } else {
        log.warn(
          `[quiz] envio da pergunta sem wamid — conversa ${conversationId}; será reenviada na próxima mensagem`
        );
      }
      await deps.store.recordOutbound(conversationId, {
        wamid: sent.wamid,
        type: "interactive",
        body: action.body,
        buttons: action.buttons,
      });
    } else {
      await deps.store.recordOutbound(conversationId, {
        wamid: sent.wamid,
        type: "text",
        body: action.body,
      });
    }
  }

  if (result.completed) {
    try {
      await deps.onComplete({
        conversationId,
        waId,
        leadId: decision.leadId,
        temPlanoAtual: result.state.temPlanoAtual,
        necessidadePrincipal: result.state.necessidadePrincipal,
        answers: result.state.answers,
      });
    } catch (err) {
      log.error(
        `[quiz] aoConcluirQuiz falhou — conversa ${conversationId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }
}
