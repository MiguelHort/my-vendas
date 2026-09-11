import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { QuizAnswer, QuizState } from "./types";

/** Estado do quiz como o orquestrador enxerga (subconjunto do motor + dedup + lead). */
export type StoredQuiz = QuizState & {
  lastInboundWamid: string | null;
  leadId: string | null;
};

export type StoredQuizPatch = Partial<StoredQuiz>;

/** Contexto da seção crítica (dentro da transação + advisory lock por contato). */
export type LockedCtx = {
  conversationId: string | null;
  quiz: StoredQuiz | null;
  save(patch: StoredQuizPatch): Promise<void>;
};

/** Registro de uma mensagem OUTBOUND do quiz pro inbox. */
export type OutboundRecord = {
  wamid: string | null;
  type: "interactive" | "text";
  body: string;
};

export interface QuizStore {
  /** Roda `fn` em série por contato (transação + advisory lock por waId). */
  runLocked<T>(waId: string, fn: (ctx: LockedCtx) => Promise<T>): Promise<T>;
  /** Grava só o wamid da última pergunta enviada (após envio confirmado). */
  setLastQuestionWamid(conversationId: string, wamid: string): Promise<void>;
  /** Registra a mensagem OUTBOUND do quiz no histórico. */
  recordOutbound(conversationId: string, rec: OutboundRecord): Promise<void>;
}

type DbQuiz = {
  status: "EM_ANDAMENTO" | "CONCLUIDO" | "INTERROMPIDO";
  currentStep: string | null;
  lastQuestionWamid: string | null;
  lastInboundWamid: string | null;
  leadId: string | null;
  invalidCount: number;
  answers: Prisma.JsonValue;
  temPlanoAtual: boolean | null;
  necessidadePrincipal: string | null;
  completedAt: Date | null;
};

function mapFromDb(q: DbQuiz): StoredQuiz {
  return {
    status: q.status,
    currentStep: q.currentStep,
    lastQuestionWamid: q.lastQuestionWamid,
    lastInboundWamid: q.lastInboundWamid,
    leadId: q.leadId,
    invalidCount: q.invalidCount,
    answers: (Array.isArray(q.answers) ? q.answers : []) as unknown as QuizAnswer[],
    temPlanoAtual: q.temPlanoAtual,
    necessidadePrincipal:
      q.necessidadePrincipal === "prevencao" || q.necessidadePrincipal === "tratamento"
        ? q.necessidadePrincipal
        : null,
    completedAt: q.completedAt ? q.completedAt.toISOString() : null,
  };
}

function mapPatchToDb(patch: StoredQuizPatch): Prisma.WhatsAppQuizStateUncheckedUpdateInput {
  const data: Prisma.WhatsAppQuizStateUncheckedUpdateInput = {};
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.currentStep !== undefined) data.currentStep = patch.currentStep;
  if (patch.lastQuestionWamid !== undefined) data.lastQuestionWamid = patch.lastQuestionWamid;
  if (patch.lastInboundWamid !== undefined) data.lastInboundWamid = patch.lastInboundWamid;
  if (patch.invalidCount !== undefined) data.invalidCount = patch.invalidCount;
  if (patch.answers !== undefined) {
    data.answers = patch.answers as unknown as Prisma.InputJsonValue;
  }
  if (patch.temPlanoAtual !== undefined) data.temPlanoAtual = patch.temPlanoAtual;
  if (patch.necessidadePrincipal !== undefined) {
    data.necessidadePrincipal = patch.necessidadePrincipal;
  }
  if (patch.completedAt !== undefined) {
    data.completedAt = patch.completedAt ? new Date(patch.completedAt) : null;
  }
  return data;
}

export const realQuizStore: QuizStore = {
  async runLocked(waId, fn) {
    return prisma.$transaction(async (tx) => {
      // Advisory lock por contato: serializa toques rápidos do mesmo número.
      // pg_advisory_xact_lock é liberado no commit/rollback e funciona em
      // transaction pooling (pgbouncer).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${waId}))`;

      const conv = await tx.whatsAppConversation.findUnique({
        where: { waId },
        select: { id: true, quizState: true },
      });

      if (!conv) {
        return fn({ conversationId: null, quiz: null, save: async () => {} });
      }
      if (!conv.quizState) {
        return fn({ conversationId: conv.id, quiz: null, save: async () => {} });
      }

      const ctx: LockedCtx = {
        conversationId: conv.id,
        quiz: mapFromDb(conv.quizState),
        save: async (patch) => {
          await tx.whatsAppQuizState.update({
            where: { conversationId: conv.id },
            data: mapPatchToDb(patch),
          });
        },
      };
      return fn(ctx);
    });
  },

  async setLastQuestionWamid(conversationId, wamid) {
    await prisma.whatsAppQuizState.update({
      where: { conversationId },
      data: { lastQuestionWamid: wamid },
    });
  },

  async recordOutbound(conversationId, rec) {
    const timestamp = new Date();
    await prisma.whatsAppMessage.create({
      data: {
        conversationId,
        waMessageId: rec.wamid,
        direction: "OUTBOUND",
        type: rec.type,
        body: rec.body,
        status: "SENT",
        timestamp,
      },
    });
    await prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: timestamp,
        lastMessagePreview: rec.type === "interactive" ? "[Pergunta do quiz]" : rec.body,
      },
    });
  },
};

/**
 * Interrompe o quiz da conversa se ele estiver em andamento — chamado quando um
 * atendente humano manda mensagem pro contato durante o quiz.
 */
export async function interruptQuizIfActive(conversationId: string): Promise<void> {
  await prisma.whatsAppQuizState.updateMany({
    where: { conversationId, status: "EM_ANDAMENTO" },
    data: { status: "INTERROMPIDO", currentStep: null, lastQuestionWamid: null },
  });
}
