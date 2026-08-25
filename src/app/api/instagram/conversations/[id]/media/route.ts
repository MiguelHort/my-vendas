import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { sendInstagramAttachment, uploadInstagramAttachment } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mesmo raciocínio do limite do WhatsApp: a Graph API aceita mais, mas o corpo da
// function na Vercel trava perto de 4.5MB no plano padrão.
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

  const conversation = await prisma.instagramConversation.findUnique({ where: { id } });
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
  const attachmentType = isImage ? "image" : "file";

  try {
    const attachmentId = await uploadInstagramAttachment(buffer, mimeType, filename, attachmentType);
    const result = await sendInstagramAttachment(conversation.igsid, attachmentType, attachmentId);

    const timestamp = new Date();
    const type = isImage ? "image" : "file";

    const message = await prisma.instagramMessage.create({
      data: {
        conversationId: id,
        igMessageId: result.message_id ?? null,
        direction: "OUTBOUND",
        type,
        mediaId: attachmentId,
        mimeType,
        filename: isImage ? null : filename,
        status: "SENT",
        sentByUserId: auth.user.id,
        timestamp,
      },
    });

    await prisma.instagramConversation.update({
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
    console.error("Erro ao enviar mídia Instagram:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha ao enviar arquivo pelo Instagram" }, { status: 502 });
  }
}
