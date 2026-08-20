import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const conversations = await prisma.whatsAppConversation.findMany({
    orderBy: { lastMessageAt: "desc" },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      wa_id: c.waId,
      contact_name: c.contactName,
      last_message_at: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
      last_message_preview: c.lastMessagePreview,
      unread_count: c.unreadCount,
    })),
  });
}
