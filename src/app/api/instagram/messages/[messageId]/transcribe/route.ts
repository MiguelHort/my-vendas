import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { downloadInstagramMedia } from "@/lib/instagram";
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

  const message = await prisma.instagramMessage.findUnique({ where: { id: messageId } });
  if (!message || message.type !== "audio" || !message.mediaUrl) {
    return NextResponse.json({ error: "Mensagem de áudio não encontrada" }, { status: 404 });
  }

  if (message.transcription) {
    return NextResponse.json({ transcription: message.transcription });
  }

  try {
    const { buffer, mimeType } = await downloadInstagramMedia(message.mediaUrl);
    const transcription = await transcribeAudio(buffer, mimeType || message.mimeType || "audio/mp4");

    await prisma.instagramMessage.update({
      where: { id: messageId },
      data: { transcription },
    });

    return NextResponse.json({ transcription });
  } catch (err) {
    console.error("Erro ao transcrever áudio Instagram:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha ao transcrever o áudio" }, { status: 502 });
  }
}
