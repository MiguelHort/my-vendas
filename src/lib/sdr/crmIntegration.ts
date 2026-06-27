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
  const dados = classification.dados_extraidos;

  // Número limpo (remove @s.whatsapp.net se vier nesse formato)
  const telefone = whatsappNumber.replace(/@.*$/, "");

  // Tenta encontrar lead existente já vinculado à conversa
  const conv = await prisma.sdrConversation.findUnique({
    where: { id: conversationId },
    select: { leadId: true },
  });

  if (conv?.leadId) {
    // Atualiza lead existente
    await prisma.lead.update({
      where: { id: conv.leadId },
      data: {
        nome: dados.nome ?? undefined,
        cidade: dados.cidade_estado?.split("/")[0]?.trim() ?? undefined,
        estado: dados.cidade_estado?.split("/")[1]?.trim() ?? undefined,
        qtdVidas: dados.vidas ?? undefined,
        temPlanoAnterior: dados.tem_plano_hoje ?? undefined,
        sdrCategoria: classification.categoria,
        sdrScore: classification.score,
        sdrQualificationData: JSON.parse(JSON.stringify(classification)),
        updatedAt: new Date(),
      },
    });
    return conv.leadId;
  }

  // Cria novo lead
  const lead = await prisma.lead.create({
    data: {
      userId,
      nome: dados.nome ?? `Lead WhatsApp ${telefone.slice(-4)}`,
      telefone,
      origem: SDR_LEAD_ORIGEM,
      status: SDR_LEAD_STATUS_INICIAL,
      dataEntrada: new Date(),
      qtdVidas: dados.vidas ?? 1,
      cidade: dados.cidade_estado?.split("/")[0]?.trim() ?? null,
      estado: dados.cidade_estado?.split("/")[1]?.trim() ?? null,
      temPlanoAnterior: dados.tem_plano_hoje ?? null,
      sdrCategoria: classification.categoria,
      sdrScore: classification.score,
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
