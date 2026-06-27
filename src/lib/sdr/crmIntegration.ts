import { prisma } from "@/lib/prisma";
import { SDR_LEAD_ORIGEM, SDR_LEAD_STATUS_INICIAL } from "./config";
import { linkLead } from "./conversationManager";
import type { ClassificationResult } from "./types";

/**
 * Cria ou atualiza o Lead no funil do corretor com os dados extraídos pelo SDR.
 * Retorna o id do lead.
 */
export async function upsertSdrLead(
  userId: string,
  conversationId: string,
  whatsappNumber: string,
  classification: ClassificationResult,
): Promise<string> {
  const { checklist, placar } = classification;
  const telefone = whatsappNumber.replace(/@.*$/, "");

  const conv = await prisma.sdrConversation.findUnique({
    where: { id: conversationId },
    select: { leadId: true },
  });

  if (conv?.leadId) {
    await prisma.lead.update({
      where: { id: conv.leadId },
      data: {
        cidade:           checklist.regiao.cidade     ?? undefined,
        estado:           checklist.regiao.estado     ?? undefined,
        qtdVidas:         checklist.vidas.quantidade  ?? undefined,
        temPlanoAnterior: checklist.plano_atual.possui ?? undefined,
        sdrCategoria:     classification.categoria,
        sdrScore:         placar.total,
        sdrQualificationData: JSON.parse(JSON.stringify(classification)),
        updatedAt: new Date(),
      },
    });
    return conv.leadId;
  }

  const lead = await prisma.lead.create({
    data: {
      userId,
      nome:             `Lead WhatsApp ${telefone.slice(-4)}`,
      telefone,
      origem:           SDR_LEAD_ORIGEM,
      status:           SDR_LEAD_STATUS_INICIAL,
      dataEntrada:      new Date(),
      qtdVidas:         checklist.vidas.quantidade    ?? 1,
      cidade:           checklist.regiao.cidade       ?? null,
      estado:           checklist.regiao.estado       ?? null,
      temPlanoAnterior: checklist.plano_atual.possui  ?? null,
      sdrCategoria:     classification.categoria,
      sdrScore:         placar.total,
      sdrQualificationData: JSON.parse(JSON.stringify(classification)),
    },
  });

  await linkLead(conversationId, lead.id);
  return lead.id;
}

/** Registra o uso de IA no log de billing. */
export async function logAiUsage(params: {
  userId: string;
  conversationId: string;
  callType: "sdr_reply" | "classifier" | "transcribe_audio";
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
}): Promise<void> {
  await prisma.aiUsageLog.create({
    data: {
      userId: params.userId,
      conversationId: params.conversationId,
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      callType: params.callType,
      tokensIn: params.tokensIn,
      tokensOut: params.tokensOut,
      costEstimate: params.costEstimate,
    },
  });
}
