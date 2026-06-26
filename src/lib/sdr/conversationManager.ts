import { prisma } from "@/lib/prisma";
import type { SdrConversation, SdrMessage } from "@prisma/client";

export type ConversationWithMessages = SdrConversation & {
  messages: SdrMessage[];
};

/**
 * Retorna a conversa ativa para o número do lead naquele corretor.
 * Se não existir, cria uma nova.
 */
export async function getOrCreateConversation(
  userId: string,
  whatsappNumber: string,
): Promise<ConversationWithMessages> {
  const existing = await prisma.sdrConversation.findUnique({
    where: { userId_whatsappNumber: { userId, whatsappNumber } },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (existing && existing.status !== "closed") {
    return existing;
  }

  // Cria nova conversa (ou reabre fechando a anterior via upsert de status)
  const conversation = await prisma.sdrConversation.upsert({
    where: { userId_whatsappNumber: { userId, whatsappNumber } },
    create: {
      userId,
      whatsappNumber,
      status: "active",
      followupCount: 0,
    },
    update: {
      status: "active",
      followupCount: 0,
      lastMessageAt: null,
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return conversation;
}

/** Salva uma mensagem na conversa e atualiza lastMessageAt. */
export async function saveMessage(
  conversationId: string,
  role: "lead" | "assistant" | "system",
  content: string,
): Promise<SdrMessage> {
  const [message] = await prisma.$transaction([
    prisma.sdrMessage.create({
      data: { conversationId, role, content },
    }),
    prisma.sdrConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), updatedAt: new Date() },
    }),
  ]);

  return message;
}

/** Registra consentimento LGPD na conversa (primeira interação). */
export async function recordConsent(conversationId: string): Promise<void> {
  await prisma.sdrConversation.update({
    where: { id: conversationId },
    data: { consentAt: new Date() },
  });
}

/** Marca a conversa como handoff (agente humano assume). */
export async function markHandoff(conversationId: string): Promise<void> {
  await prisma.sdrConversation.update({
    where: { id: conversationId },
    data: { status: "handoff", updatedAt: new Date() },
  });
}

/** Incrementa o contador de follow-ups. Retorna o novo valor. */
export async function incrementFollowup(conversationId: string): Promise<number> {
  const updated = await prisma.sdrConversation.update({
    where: { id: conversationId },
    data: { followupCount: { increment: 1 } },
    select: { followupCount: true },
  });
  return updated.followupCount;
}

/** Vincula um lead criado/encontrado à conversa. */
export async function linkLead(
  conversationId: string,
  leadId: string,
): Promise<void> {
  await prisma.sdrConversation.update({
    where: { id: conversationId },
    data: { leadId },
  });
}
