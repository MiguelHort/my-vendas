import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { sendInstagramAttachment, uploadInstagramAttachment } from "@/lib/instagram";
import { transcodeToOggOpus } from "@/lib/audioTranscode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  const conversation = await prisma.instagramConversation.findUnique({ where: { id } });
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

  const rawBuffer = Buffer.from(await file.arrayBuffer());

  try {
    // Mesma normalização usada no áudio do WhatsApp — grava em qualquer navegador
    // e sempre sobe um ogg/opus válido, evitando o mesmo problema de container
    // incompleto que já vimos com o MediaRecorder do Chrome/Safari.
    const buffer = await transcodeToOggOpus(rawBuffer);

    const attachmentId = await uploadInstagramAttachment(buffer, "audio/ogg", "audio.ogg", "audio");
    const result = await sendInstagramAttachment(conversation.igsid, "audio", attachmentId);
    const timestamp = new Date();

    const message = await prisma.instagramMessage.create({
      data: {
        conversationId: id,
        igMessageId: result.message_id ?? null,
        direction: "OUTBOUND",
        type: "audio",
        mediaId: attachmentId,
        mimeType: "audio/ogg",
        status: "SENT",
        sentByUserId: auth.user.id,
        timestamp,
      },
    });

    await prisma.instagramConversation.update({
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
    console.error("Erro ao enviar áudio Instagram:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha ao enviar áudio pelo Instagram" }, { status: 502 });
  }
}
