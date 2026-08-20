import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { downloadWhatsAppMedia } from "@/lib/whatsapp";
import { transcribeAudio } from "@/lib/audioTranscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { messageId } = await context.params;

  const message = await prisma.whatsAppMessage.findUnique({ where: { id: messageId } });
  if (!message || message.type !== "audio" || !message.mediaId) {
    return NextResponse.json({ error: "Mensagem de áudio não encontrada" }, { status: 404 });
  }

  if (message.transcription) {
    return NextResponse.json({ transcription: message.transcription });
  }

  try {
    const { buffer, mimeType } = await downloadWhatsAppMedia(message.mediaId);
    const transcription = await transcribeAudio(buffer, mimeType || message.mimeType || "audio/ogg");

    await prisma.whatsAppMessage.update({
      where: { id: messageId },
      data: { transcription },
    });

    return NextResponse.json({ transcription });
  } catch (err) {
    console.error("Erro ao transcrever áudio:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha ao transcrever o áudio" }, { status: 502 });
  }
}
