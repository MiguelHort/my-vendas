import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { sendWhatsAppAudio, uploadWhatsAppMedia } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 16 * 1024 * 1024; // limite de áudio da Cloud API

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  const conversation = await prisma.whatsAppConversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo de áudio é obrigatório" }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Áudio muito grande (máx. 16MB)" }, { status: 400 });
  }

  const mimeType = file.type || "audio/ogg";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const mediaId = await uploadWhatsAppMedia(buffer, mimeType, file.name || "audio");
    const result = await sendWhatsAppAudio(conversation.waId, mediaId);
    const waMessageId = result.messages?.[0]?.id;
    const timestamp = new Date();

    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId: id,
        waMessageId: waMessageId ?? null,
        direction: "OUTBOUND",
        type: "audio",
        mediaId,
        mimeType,
        status: "SENT",
        sentByUserId: auth.user.id,
        timestamp,
      },
    });

    await prisma.whatsAppConversation.update({
      where: { id },
      data: { lastMessageAt: timestamp, lastMessagePreview: "🎤 Áudio" },
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
    console.error("Erro ao enviar áudio WhatsApp:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha ao enviar áudio pelo WhatsApp" }, { status: 502 });
  }
}
