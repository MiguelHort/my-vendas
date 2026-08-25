import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { sendInstagramText } from "@/lib/instagram";

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

  const conversation = await prisma.instagramConversation.findUnique({
    where: { id },
    include: {
      lead: {
        select: { id: true, status: true, operadoraOfertada: true, valorMensalidade: true },
      },
    },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const messages = await prisma.instagramMessage.findMany({
    where: { conversationId: id },
    orderBy: { timestamp: "asc" },
    take: 500,
  });

  if (conversation.unreadCount > 0) {
    await prisma.instagramConversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      igsid: conversation.igsid,
      username: conversation.username,
    },
    lead: conversation.lead
      ? {
          id: conversation.lead.id,
          status: conversation.lead.status,
          operadora_ofertada: conversation.lead.operadoraOfertada,
          valor_mensalidade:
            conversation.lead.valorMensalidade != null
              ? Number(conversation.lead.valorMensalidade)
              : null,
        }
      : null,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      type: m.type,
      body: m.body,
      status: m.status,
      error_message: m.errorMessage,
      transcription: m.transcription,
      filename: m.filename,
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

  const conversation = await prisma.instagramConversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  try {
    const result = await sendInstagramText(conversation.igsid, text);
    const timestamp = new Date();

    const message = await prisma.instagramMessage.create({
      data: {
        conversationId: id,
        igMessageId: result.message_id ?? null,
        direction: "OUTBOUND",
        type: "text",
        body: text,
        status: "SENT",
        sentByUserId: auth.user.id,
        timestamp,
      },
    });

    await prisma.instagramConversation.update({
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
    console.error("Erro ao enviar mensagem Instagram:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Falha ao enviar mensagem pelo Instagram" },
      { status: 502 }
    );
  }
}
