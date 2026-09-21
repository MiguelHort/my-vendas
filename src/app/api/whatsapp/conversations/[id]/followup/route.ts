import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Soma +1 no contador de follow-up da conversa. A etiqueta de follow-up é fixa
 * em toda conversa: só existe esta operação de aumentar — não há como remover
 * nem diminuir. O incremento é atômico (duas pessoas clicando não perdem contagem).
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const updated = await prisma.whatsAppConversation.update({
      where: { id },
      data: { followUpCount: { increment: 1 } },
      select: { followUpCount: true },
    });
    return NextResponse.json({ follow_up_count: updated.followUpCount });
  } catch {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }
}
