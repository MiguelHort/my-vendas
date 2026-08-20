import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeWaId, verifyMetaSignature } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WaContact = { wa_id: string; profile?: { name?: string } };

type WaMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  caption?: string;
};

type WaStatus = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  errors?: { title?: string }[];
};

type WaChangeValue = {
  contacts?: WaContact[];
  messages?: WaMessage[];
  statuses?: WaStatus[];
};

const TYPE_LABELS: Record<string, string> = {
  image: "[Imagem]",
  audio: "[Áudio]",
  video: "[Vídeo]",
  document: "[Documento]",
  sticker: "[Figurinha]",
  location: "[Localização]",
  contacts: "[Contato]",
  button: "[Botão]",
  interactive: "[Resposta interativa]",
};

function previewFor(msg: WaMessage) {
  if (msg.type === "text") return msg.text?.body ?? "";
  return msg.caption || TYPE_LABELS[msg.type] || `[${msg.type}]`;
}

/**
 * GET = verificação do webhook (Meta).
 * O hub.challenge precisa voltar como texto puro — a Meta rejeita se vier
 * dentro de um JSON (NextResponse.json envolveria em aspas / outro content-type).
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
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Invalid verify token", { status: 403 });
}

export async function POST(req: NextRequest) {
  // Precisa do corpo bruto (raw) pra validar a assinatura antes de fazer JSON.parse
  const rawBody = await req.text();

  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature)) {
    console.error("WhatsApp webhook: assinatura inválida");
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: { entry?: { changes?: { value: WaChangeValue }[] }[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Responde 200 rápido é o requisito da Meta — o processamento abaixo é só
  // upserts simples no banco (sem chamadas externas), então roda inline mesmo.
  try {
    const changes = body?.entry?.flatMap((e) => e.changes ?? []) ?? [];

    for (const change of changes) {
      await processChangeValue(change.value);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro webhook WhatsApp:", err instanceof Error ? err.message : err);
    // Ainda devolve 200 pra Meta não entrar em loop de retry
    return NextResponse.json({ ok: true, error: "processed_with_error" });
  }
}

async function processChangeValue(value: WaChangeValue) {
  const nameByWaId = new Map<string, string>();
  for (const c of value.contacts ?? []) {
    if (c.profile?.name) nameByWaId.set(normalizeWaId(c.wa_id), c.profile.name);
  }

  for (const msg of value.messages ?? []) {
    const waId = normalizeWaId(msg.from);
    const timestamp = new Date(Number(msg.timestamp) * 1000);
    const preview = previewFor(msg);
    const contactName = nameByWaId.get(waId);

    const conversation = await prisma.whatsAppConversation.upsert({
      where: { waId },
      create: {
        waId,
        contactName: contactName ?? null,
        lastMessageAt: timestamp,
        lastMessagePreview: preview,
        unreadCount: 1,
      },
      update: {
        ...(contactName ? { contactName } : {}),
        lastMessageAt: timestamp,
        lastMessagePreview: preview,
        unreadCount: { increment: 1 },
      },
    });

    await prisma.whatsAppMessage.upsert({
      where: { waMessageId: msg.id },
      create: {
        conversationId: conversation.id,
        waMessageId: msg.id,
        direction: "INBOUND",
        type: msg.type,
        body: msg.type === "text" ? msg.text?.body ?? "" : preview,
        timestamp,
      },
      update: {},
    });
  }

  for (const status of value.statuses ?? []) {
    const mapped =
      status.status === "sent"
        ? "SENT"
        : status.status === "delivered"
          ? "DELIVERED"
          : status.status === "read"
            ? "READ"
            : "FAILED";

    await prisma.whatsAppMessage.updateMany({
      where: { waMessageId: status.id },
      data: {
        status: mapped,
        errorMessage: status.errors?.[0]?.title ?? null,
      },
    });
  }
}
