import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidDate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * GET ?since=YYYY-MM-DD&until=YYYY-MM-DD
 * Quantas conversas de WhatsApp entraram por cada anúncio (Click-to-WhatsApp) no
 * período — dado nosso, vindo do `referral` do webhook, que a Marketing API não
 * entrega como "lead". Chave = id do anúncio, o mesmo `ad_id` da tela de Anúncios.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");
  if (!isValidDate(since) || !isValidDate(until)) {
    return NextResponse.json({ error: "since/until precisam ser YYYY-MM-DD" }, { status: 400 });
  }

  // Dia inteiro no horário de Brasília (UTC-3), igual ao resto do sistema.
  const from = new Date(`${since}T00:00:00-03:00`);
  const to = new Date(`${until}T23:59:59.999-03:00`);

  const groups = await prisma.whatsAppConversation.groupBy({
    by: ["adSourceId"],
    where: { adSourceId: { not: null }, createdAt: { gte: from, lte: to } },
    _count: { _all: true },
  });

  return NextResponse.json({
    rows: groups.map((g) => ({ ad_id: g.adSourceId as string, conversations: g._count._all })),
  });
}
