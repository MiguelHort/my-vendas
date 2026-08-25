import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { downloadInstagramMedia } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy pra mídia do Instagram — o navegador não manda Authorization pro <img>/<audio>,
 * então baixamos aqui e servimos os bytes direto.
 *
 * Só funciona pra mídia RECEBIDA (o webhook manda uma URL assinada pronta). Mídia que
 * a gente mesma enviou não tem URL de volta — a Attachment Upload API do Instagram só
 * devolve um attachment_id reusável pra mandar, não um jeito de baixar depois.
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

  const message = await prisma.instagramMessage.findUnique({ where: { id: messageId } });
  if (!message || !message.mediaUrl) {
    return NextResponse.json({ error: "Mídia não disponível" }, { status: 404 });
  }

  try {
    const { buffer, mimeType } = await downloadInstagramMedia(message.mediaUrl);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType || message.mimeType || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Erro ao baixar mídia Instagram:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha ao carregar mídia" }, { status: 502 });
  }
}
