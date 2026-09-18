import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { sendWhatsAppTemplate, WhatsAppSendError, type WhatsAppTemplateParam } from "@/lib/whatsapp";
import { onlyDigits, phoneSuffix } from "@/lib/leadMatch";
import { formatPhoneNumber } from "@/lib/phoneMask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inicia uma conversa nova de WhatsApp mandando um Message Template pra um
 * número que ainda nunca falou com a gente — a Meta só aceita template nesse
 * caso (não dá pra mandar texto livre pra quem nunca te mandou mensagem,
 * mesma regra da janela de 24h, ver lib/whatsapp.ts).
 *
 * Se já existir uma conversa com esse número, não manda nada — devolve a
 * conversa existente pra UI só abrir ela.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const phoneRaw: string | undefined = body?.phone;
  const contactName: string | null =
    typeof body?.contact_name === "string" && body.contact_name.trim()
      ? body.contact_name.trim()
      : null;
  const templateName: string | undefined = body?.template_name?.trim();
  const language: string | undefined = body?.language?.trim();
  const bodyParams: WhatsAppTemplateParam[] = Array.isArray(body?.body_params) ? body.body_params : [];
  const previewText: string =
    typeof body?.preview_text === "string" && body.preview_text.trim()
      ? body.preview_text.trim()
      : `[Modelo: ${templateName ?? "?"}]`;

  const digits = onlyDigits(phoneRaw);
  if (digits.length < 10) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  }
  if (!templateName || !language) {
    return NextResponse.json({ error: "Escolha um modelo pra enviar" }, { status: 400 });
  }

  // DDD + número sem "55" na frente (formato mais comum digitado); se já veio
  // com "55" e mais de 11 dígitos, não duplica o prefixo.
  const waId = digits.length > 11 && digits.startsWith("55") ? digits : `55${digits}`;

  // Casa por sufixo de 8 dígitos (não pelo wa_id exato) — mesmo critério do
  // resto do app (lib/leadMatch.ts): números brasileiros às vezes têm o "9" a
  // mais/a menos dependendo de onde vieram, então uma comparação exata deixaria
  // passar uma conversa duplicada pro mesmo contato.
  const suffix = phoneSuffix(waId);
  const allConversations = await prisma.whatsAppConversation.findMany({
    select: { id: true, waId: true },
  });
  const existing = suffix ? allConversations.find((c) => phoneSuffix(c.waId) === suffix) : undefined;
  if (existing) {
    return NextResponse.json({ conversation: { id: existing.id }, already_existed: true });
  }

  try {
    const result = await sendWhatsAppTemplate(waId, templateName, language, bodyParams);
    const waMessageId = result.messages?.[0]?.id;
    const timestamp = new Date();

    // A Meta devolve o wa_id CANÔNICO desse número (`contacts[0].wa_id`) — pode
    // diferir do que a gente mandou (o clássico "9" a mais/a menos de número
    // brasileiro). Se a gente gravar o `waId` que digitamos em vez do canônico,
    // quando o contato responder o webhook não vai casar com essa conversa e
    // cria um contato duplicado do zero (com quiz e tudo). Sempre grava o da Meta.
    const canonicalWaId = result.contacts?.[0]?.wa_id || waId;

    const conversation = await prisma.whatsAppConversation.create({
      data: {
        waId: canonicalWaId,
        contactName,
        lastMessageAt: timestamp,
        lastMessagePreview: previewText,
        unreadCount: 0,
      },
    });

    await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        waMessageId: waMessageId ?? null,
        direction: "OUTBOUND",
        type: "template",
        body: previewText,
        status: "SENT",
        sentByUserId: auth.user.id,
        timestamp,
      },
    });

    // Mesma regra do webhook: todo contato novo de WhatsApp vira lead em
    // Triagem, pra ninguém ficar de fora do funil — não importa quem falou primeiro.
    await prisma.lead.create({
      data: {
        nome: contactName || formatPhoneNumber(canonicalWaId.replace(/^55/, "")) || canonicalWaId,
        telefone: canonicalWaId,
        origem: "WhatsApp",
        status: "Triagem",
        dataEntrada: timestamp,
        qtdVidas: 1,
      },
    });

    return NextResponse.json(
      { conversation: { id: conversation.id }, already_existed: false },
      { status: 201 }
    );
  } catch (err) {
    const friendly = err instanceof WhatsAppSendError ? err.friendlyMessage : null;
    console.error("Erro ao iniciar conversa de WhatsApp:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: friendly ?? "Falha ao enviar o modelo pelo WhatsApp" },
      { status: 502 }
    );
  }
}
