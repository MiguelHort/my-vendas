import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const messages = await prisma.whatsAppMessage.findMany({
    where: { conversationId: id },
    orderBy: { timestamp: "asc" },
    take: 500,
  });

  if (conversation.unreadCount > 0) {
    await prisma.whatsAppConversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      wa_id: conversation.waId,
      contact_name: conversation.contactName,
    },
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      type: m.type,
      body: m.body,
      status: m.status,
      error_message: m.errorMessage,
      transcription: m.transcription,
      timestamp: m.timestamp.toISOString(),
    })),
  });
}

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
  const text = body?.text?.trim();

  if (!text) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  }

  const conversation = await prisma.whatsAppConversation.findUnique({
    where: { id },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  try {
    const result = await sendWhatsAppText(conversation.waId, text);
    const waMessageId = result.messages?.[0]?.id;
    const timestamp = new Date();

    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId: id,
        waMessageId: waMessageId ?? null,
        direction: "OUTBOUND",
        type: "text",
        body: text,
        status: "SENT",
        sentByUserId: auth.user.id,
        timestamp,
      },
    });

    await prisma.whatsAppConversation.update({
      where: { id },
      data: { lastMessageAt: timestamp, lastMessagePreview: text },
    });

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
    console.error("Erro ao enviar mensagem WhatsApp:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Falha ao enviar mensagem pelo WhatsApp" },
      { status: 502 }
    );
  }
}
