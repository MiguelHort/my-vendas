import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { getHiddenPhoneSuffixes, phoneSuffix } from "@/lib/leadMatch";

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

  // Conversas de leads dispensados/concluídos ficam escondidas do inbox — não contam no badge.
  const [unread, hidden] = await Promise.all([
    prisma.whatsAppConversation.findMany({
      where: { unreadCount: { gt: 0 } },
      select: { waId: true, unreadCount: true },
    }),
    getHiddenPhoneSuffixes(),
  ]);
  const count = unread
    .filter((c) => !hidden.has(phoneSuffix(c.waId)))
    .reduce((sum, c) => sum + c.unreadCount, 0);

  return NextResponse.json({ count });
}
