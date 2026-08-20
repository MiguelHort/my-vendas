import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { sendWhatsAppDocument, sendWhatsAppImage, uploadWhatsAppMedia } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A Cloud API aceita até 5MB (imagem) / 100MB (documento), mas o limite real
// aqui é o body da function serverless — na Vercel isso fica em ~4.5MB no plano
// padrão. 4MB fica com margem de segurança pros dois tipos.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

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
    return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `Arquivo muito grande (máx. ${Math.round(maxBytes / 1024 / 1024)}MB)` },
      { status: 400 }
    );
  }

  const mimeType = file.type || "application/octet-stream";
  const filename = file.name || (isImage ? "imagem" : "arquivo");
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const mediaId = await uploadWhatsAppMedia(buffer, mimeType, filename);
    const result = isImage
      ? await sendWhatsAppImage(conversation.waId, mediaId)
      : await sendWhatsAppDocument(conversation.waId, mediaId, filename);

    const waMessageId = result.messages?.[0]?.id;
    const timestamp = new Date();
    const type = isImage ? "image" : "document";

    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId: id,
        waMessageId: waMessageId ?? null,
        direction: "OUTBOUND",
        type,
        mediaId,
        mimeType,
        filename: isImage ? null : filename,
        status: "SENT",
        sentByUserId: auth.user.id,
        timestamp,
      },
    });

    await prisma.whatsAppConversation.update({
      where: { id },
      data: {
        lastMessageAt: timestamp,
        lastMessagePreview: isImage ? "📷 Foto" : `📎 ${filename}`,
      },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        direction: message.direction,
        type: message.type,
        body: message.body,
        filename: message.filename,
        status: message.status,
        timestamp: message.timestamp.toISOString(),
      },
    });
  } catch (err) {
    console.error("Erro ao enviar mídia WhatsApp:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha ao enviar arquivo pelo WhatsApp" }, { status: 502 });
  }
}
