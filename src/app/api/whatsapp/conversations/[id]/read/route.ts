import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zera o contador de não lidas na mão. Existe pra quem desligou "marcar como
 * lida ao abrir" (perfil) — sem essa opção o servidor não zera sozinho, então
 * precisa de uma ação explícita pra limpar o badge da lista.
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
    await prisma.whatsAppConversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }
}
