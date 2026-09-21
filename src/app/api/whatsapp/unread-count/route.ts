import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { getDispensedPhoneSuffixes, phoneSuffix } from "@/lib/leadMatch";

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

  // Conversas de leads dispensados ficam escondidas do inbox — não contam no badge.
  const [unread, dispensed] = await Promise.all([
    prisma.whatsAppConversation.findMany({
      where: { unreadCount: { gt: 0 } },
      select: { waId: true, unreadCount: true },
    }),
    getDispensedPhoneSuffixes(),
  ]);
  const count = unread
    .filter((c) => !dispensed.has(phoneSuffix(c.waId)))
    .reduce((sum, c) => sum + c.unreadCount, 0);

  return NextResponse.json({ count });
}
