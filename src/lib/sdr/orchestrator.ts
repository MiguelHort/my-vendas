import { prisma } from "@/lib/prisma";
import { zavuProvider } from "./providers/zavu";
import {
  getOrCreateConversation,
  saveMessage,
  recordConsent,
  markHandoff,
} from "./conversationManager";
import {
  sdrReply,
  classifyConversation,
  buildHistoryFromMessages,
  buildConversationText,
} from "./geminiClient";
import { normalizeClassification } from "./classifier";
import { upsertSdrLead, logAiUsage } from "./crmIntegration";
import { notifyHandoff } from "./notifier";
import { buildSystemPrompt, buildGreeting } from "./systemPrompt";
import type { IncomingMessage } from "./types";

/**
 * Ponto de entrada principal do SDR.
 * Chamado pelo webhook da Zavu para cada mensagem recebida.
 */
export async function handleIncomingMessage(msg: IncomingMessage): Promise<void> {
  // 1. Resolver tenant: senderId → usuário/corretor
  const instance = await prisma.whatsappInstance.findUnique({
    where: { senderId: msg.senderId },
    include: {
      user: {
        include: { sdrConfig: true },
      },
    },
  });

  if (!instance) {
    console.warn(`[SDR] senderId desconhecido: ${msg.senderId}`);
    return;
  }

  const user = instance.user;
  const config = user.sdrConfig;

  // 2. Verificar se SDR está habilitado
  if (!config?.enabled) {
    console.log(`[SDR] SDR desabilitado para usuário ${user.id} — ignorando mensagem`);
    return;
  }

  // 3. Carregar/criar conversa
  const conversation = await getOrCreateConversation(user.id, msg.from);

  // Se conversa em handoff, não responder mais via SDR
  if (conversation.status === "handoff") {
    console.log(`[SDR] Conversa ${conversation.id} em handoff — ignorando`);
    return;
  }

  // 4. Registrar consentimento LGPD na primeira mensagem
  if (!conversation.consentAt) {
    await recordConsent(conversation.id);
  }

  // 5. Salvar mensagem do lead
  await saveMessage(conversation.id, "lead", msg.body);

  const allMessages = [
    ...conversation.messages,
    { role: "lead", content: msg.body },
  ];

  const isFirstMessage = conversation.messages.length === 0;

  // 6. Gerar resposta via Gemini
  const systemPrompt = buildSystemPrompt({
    nomeAssistente: config.nomeAssistente,
    nomeCorretor: user.name ?? user.email,
  });

  let assistantText: string;

  if (isFirstMessage) {
    assistantText = buildGreeting(
      config.nomeAssistente,
      user.name ?? user.email,
      config.saudacao,
    );
  } else {
    const history = buildHistoryFromMessages(allMessages.slice(0, -1));
    const replyResult = await sdrReply(systemPrompt, history, msg.body);
    assistantText = replyResult.text;

    await logAiUsage({
      userId: user.id,
      conversationId: conversation.id,
      callType: "sdr_reply",
      tokensIn: replyResult.tokensIn,
      tokensOut: replyResult.tokensOut,
      costEstimate: replyResult.costEstimate,
    });
  }

  // 7. Salvar resposta do SDR
  await saveMessage(conversation.id, "assistant", assistantText);

  // 8. Classificar conversa (a partir da 2ª troca)
  if (allMessages.length >= 2) {
    const conversationText = buildConversationText(allMessages);

    try {
      const { result: rawClassification, tokensIn, tokensOut, costEstimate } =
        await classifyConversation(conversationText);

      await logAiUsage({
        userId: user.id,
        conversationId: conversation.id,
        callType: "classifier",
        tokensIn,
        tokensOut,
        costEstimate,
      });

      const classification = normalizeClassification(
        rawClassification,
        config.handoffMinCategoria,
      );

      // 9. Atualizar/criar lead no CRM
      const leadId = await upsertSdrLead(
        user.id,
        conversation.id,
        msg.from,
        classification,
      );

      // 10. Handoff se necessário
      if (classification.handoff && conversation.status !== "handoff") {
        await markHandoff(conversation.id);

        await notifyHandoff({
          corretor: { name: user.name, email: user.email },
          lead: {
            nome: classification.dados_extraidos.nome,
            telefone: msg.from,
            leadId,
          },
          classification,
        });

        const handoffMsg =
          `Ótimo! Já vou chamar ${user.name ?? "o(a) corretor(a)"} para te atender pessoalmente. ` +
          `Em breve você receberá o contato. 😊`;

        await saveMessage(conversation.id, "assistant", handoffMsg);
        await zavuProvider.sendText(msg.senderId, msg.from, assistantText);
        await zavuProvider.sendText(msg.senderId, msg.from, handoffMsg);
        return;
      }

      if (classification.proxima_acao === "arquivar") {
        console.log(`[SDR] Lead arquivado (categoria E): ${conversation.id}`);
      }
    } catch (err) {
      console.error("[SDR] Erro no classificador:", err);
    }
  }

  // 11. Enviar resposta ao lead
  await zavuProvider.sendText(msg.senderId, msg.from, assistantText);
}

/**
 * Parser do payload bruto do webhook da Zavu para IncomingMessage.
 * Retorna null se não for uma mensagem de texto processável.
 *
 * Formato Zavu:
 * {
 *   id, type: "message.inbound", timestamp, senderId, projectId,
 *   data: { messageId, from, to, channel, messageType, text, profileName, providerTimestamp }
 * }
 */
export function parseZavuPayload(
  body: Record<string, unknown>,
): IncomingMessage | null {
  try {
    const type = body.type as string;

    // Só processa mensagens recebidas de WhatsApp
    if (type !== "message.inbound" && type !== "conversation.new") return null;

    const senderId = body.senderId as string;
    if (!senderId) return null;

    const data = body.data as Record<string, unknown>;
    if (!data) return null;

    // Filtra só WhatsApp
    if (data.channel !== "whatsapp") return null;

    // Só texto por ora (áudio/imagem = não suportado)
    if (data.messageType !== "text") {
      console.log(`[SDR] Tipo não suportado: ${data.messageType}`);
      return null;
    }

    const bodyText = (data.text as string)?.trim();
    if (!bodyText) return null;

    const from = data.from as string;
    if (!from) return null;

    const messageId = data.messageId as string;
    const timestamp = (data.providerTimestamp as number) ?? Date.now();

    return { senderId, from, body: bodyText, messageId, timestamp };
  } catch {
    return null;
  }
}
