import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Total de mensagens não lidas em todas as conversas do WhatsApp — usado pro
 * badge no menu lateral e pro contador no título da aba (igual WhatsApp Web).
 * Endpoint enxuto de propósito: é chamado em toda página do CRM, não só no inbox.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await prisma.whatsAppConversation.aggregate({
    _sum: { unreadCount: true },
  });

  return NextResponse.json({ count: result._sum.unreadCount ?? 0 });
}
