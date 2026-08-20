import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { downloadWhatsAppMedia } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy pra mídia do WhatsApp: o <audio>/<img> do navegador não manda
 * Authorization, e a URL que a Meta devolve é temporária e também exige
 * o token da Cloud API — por isso baixamos aqui e servimos os bytes direto.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { messageId } = await context.params;

  const message = await prisma.whatsAppMessage.findUnique({ where: { id: messageId } });
  if (!message || !message.mediaId) {
    return NextResponse.json({ error: "Mídia não encontrada" }, { status: 404 });
  }

  try {
    const { buffer, mimeType } = await downloadWhatsAppMedia(message.mediaId);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType || message.mimeType || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Erro ao baixar mídia WhatsApp:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha ao carregar mídia" }, { status: 502 });
  }
}
