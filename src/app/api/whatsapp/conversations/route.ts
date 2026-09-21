import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { getDispensedPhoneSuffixes, phoneSuffix } from "@/lib/leadMatch";
import { toAdReferralDto } from "@/lib/adReferral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TagDto = { id: string; name: string; color: string };

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [allConversations, dispensed] = await Promise.all([
    prisma.whatsAppConversation.findMany({ orderBy: { lastMessageAt: "desc" } }),
    getDispensedPhoneSuffixes(),
  ]);
  // Lead dispensado no funil não aparece mais nas conversas.
  const conversations = allConversations.filter((c) => !dispensed.has(phoneSuffix(c.waId)));

  // Última mensagem de cada conversa (direção + status) pra mostrar o "visto" na lista.
  const lastMessages = await prisma.whatsAppMessage.findMany({
    where: { conversationId: { in: conversations.map((c) => c.id) } },
    distinct: ["conversationId"],
    orderBy: [{ conversationId: "asc" }, { timestamp: "desc" }],
    select: { conversationId: true, direction: true, status: true },
  });
  const lastByConversation = new Map(lastMessages.map((m) => [m.conversationId, m]));

  // Mapa telefone (sufixo de 8 dígitos) -> etiquetas do lead, pra montar a lista
  // já com as tags e permitir filtrar por etiqueta no cliente.
  const leads = await prisma.lead.findMany({
    where: { telefone: { not: null } },
    select: {
      telefone: true,
      createdAt: true,
      tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tagsBySuffix = new Map<string, TagDto[]>();
  for (const l of leads) {
    const suffix = phoneSuffix(l.telefone);
    if (!suffix || tagsBySuffix.has(suffix)) continue; // primeiro lead (mais recente) vence
    tagsBySuffix.set(
      suffix,
      l.tags.map((r) => ({ id: r.tag.id, name: r.tag.name, color: r.tag.color }))
    );
  }

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      wa_id: c.waId,
      contact_name: c.contactName,
      last_message_at: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
      last_message_preview: c.lastMessagePreview,
      unread_count: c.unreadCount,
      last_message_direction: lastByConversation.get(c.id)?.direction ?? null,
      last_message_status: lastByConversation.get(c.id)?.status ?? null,
      tags: tagsBySuffix.get(phoneSuffix(c.waId)) ?? [],
      ad: toAdReferralDto(c.adReferral),
    })),
  });
}
