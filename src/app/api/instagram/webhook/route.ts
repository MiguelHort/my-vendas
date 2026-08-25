import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchInstagramProfile } from "@/lib/instagram";
import { verifyMetaSignature } from "@/lib/metaSignature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IgAttachment = { type: string; payload?: { url?: string } };

type IgMessage = {
  mid: string;
  text?: string;
  is_echo?: boolean;
  attachments?: IgAttachment[];
};

type IgMessagingEvent = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: IgMessage;
};

type IgEntry = {
  id: string;
  time: number;
  messaging?: IgMessagingEvent[];
};

type IgWebhookBody = {
  object?: string;
  entry?: IgEntry[];
};

const TYPE_LABELS: Record<string, string> = {
  image: "[Imagem]",
  audio: "[Áudio]",
  video: "[Vídeo]",
  file: "[Documento]",
  share: "[Compartilhado]",
  story_mention: "[Menção no story]",
  reel: "[Reels]",
};

function previewFor(msg: IgMessage) {
  if (msg.text) return msg.text;
  const type = msg.attachments?.[0]?.type;
  return (type && TYPE_LABELS[type]) || (type ? `[${type}]` : "[Mensagem]");
}

function extractContent(msg: IgMessage) {
  if (msg.text) {
    return { body: msg.text, type: "text", mediaUrl: null as string | null };
  }
  const attachment = msg.attachments?.[0];
  if (attachment) {
    return { body: null, type: attachment.type, mediaUrl: attachment.payload?.url ?? null };
  }
  return { body: "[Mensagem]", type: "unknown", mediaUrl: null };
}

/**
 * GET = verificação do webhook (Meta). Mesmo mecanismo do WhatsApp: hub.challenge
 * como texto puro.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    challenge &&
    token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Invalid verify token", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    console.error("Instagram webhook: assinatura inválida");
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: IgWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    for (const entry of body.entry ?? []) {
      await processEntry(entry);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro webhook Instagram:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: true, error: "processed_with_error" });
  }
}

async function processEntry(entry: IgEntry) {
  for (const event of entry.messaging ?? []) {
    const msg = event.message;
    // Eco das nossas próprias mensagens enviadas — já registramos elas na hora do envio.
    if (!msg || msg.is_echo) continue;

    const igsid = event.sender.id;
    const timestamp = new Date(event.timestamp);
    const preview = previewFor(msg);

    const existingConversation = await prisma.instagramConversation.findUnique({
      where: { igsid },
    });

    let conversation;
    if (existingConversation) {
      conversation = await prisma.instagramConversation.update({
        where: { igsid },
        data: {
          lastMessageAt: timestamp,
          lastMessagePreview: preview,
          unreadCount: { increment: 1 },
        },
      });
    } else {
      // Todo contato que manda a primeira mensagem já vira um lead em Triagem,
      // igual ao que fizemos pro WhatsApp — mas aqui ligamos direto pelo lead_id,
      // já que IGSID não é telefone pra casar por número.
      const profile = await fetchInstagramProfile(igsid);
      const displayName = profile?.name || profile?.username || null;

      const lead = await prisma.lead.create({
        data: {
          nome: displayName || `Contato Instagram (${igsid.slice(-6)})`,
          origem: "Instagram",
          status: "Triagem",
          dataEntrada: timestamp,
          qtdVidas: 1,
        },
      });

      conversation = await prisma.instagramConversation.create({
        data: {
          igsid,
          username: profile?.username ?? null,
          lastMessageAt: timestamp,
          lastMessagePreview: preview,
          unreadCount: 1,
          leadId: lead.id,
        },
      });
    }

    const content = extractContent(msg);

    await prisma.instagramMessage.upsert({
      where: { igMessageId: msg.mid },
      create: {
        conversationId: conversation.id,
        igMessageId: msg.mid,
        direction: "INBOUND",
        type: content.type,
        body: content.body,
        mediaUrl: content.mediaUrl,
        timestamp,
      },
      update: {},
    });
  }
}
