import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { sendWhatsAppTemplate, WhatsAppSendError, type WhatsAppTemplateParam } from "@/lib/whatsapp";
import { interruptQuizIfActive } from "@/lib/quiz/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Envia um Message Template aprovado — único tipo de mensagem que a Meta aceita
 * fora da janela de 24h desde a última mensagem do contato (ver lib/whatsapp.ts).
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);

  const templateName: string | undefined = body?.template_name?.trim();
  const language: string | undefined = body?.language?.trim();
  const bodyParams: WhatsAppTemplateParam[] = Array.isArray(body?.body_params) ? body.body_params : [];
  const previewText: string =
    typeof body?.preview_text === "string" && body.preview_text.trim()
      ? body.preview_text.trim()
      : `[Modelo: ${templateName ?? "?"}]`;

  if (!templateName || !language) {
    return NextResponse.json({ error: "template_name e language são obrigatórios" }, { status: 400 });
  }

  const conversation = await prisma.whatsAppConversation.findUnique({
    where: { id },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  try {
    const result = await sendWhatsAppTemplate(conversation.waId, templateName, language, bodyParams);
    const waMessageId = result.messages?.[0]?.id;
    const timestamp = new Date();

    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId: id,
        waMessageId: waMessageId ?? null,
        direction: "OUTBOUND",
        type: "template",
        body: previewText,
        status: "SENT",
        sentByUserId: auth.user.id,
        timestamp,
      },
    });

    await prisma.whatsAppConversation.update({
      where: { id },
      data: { lastMessageAt: timestamp, lastMessagePreview: previewText },
    });

    // Atendente humano respondeu → interrompe o quiz, se estiver rolando.
    await interruptQuizIfActive(id);

    return NextResponse.json({
      message: {
        id: message.id,
        direction: message.direction,
        type: message.type,
        body: message.body,
        status: message.status,
        timestamp: message.timestamp.toISOString(),
      },
    });
  } catch (err) {
    const friendly = err instanceof WhatsAppSendError ? err.friendlyMessage : null;
    console.error("Erro ao enviar template WhatsApp:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: friendly ?? "Falha ao enviar o modelo pelo WhatsApp" },
      { status: 502 }
    );
  }
}
