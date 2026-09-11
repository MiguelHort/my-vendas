import { NextRequest, NextResponse, after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeWaId } from "@/lib/whatsapp";
import { verifyMetaSignature } from "@/lib/metaSignature";
import { formatPhoneNumber } from "@/lib/phoneMask";
import { QUIZ_DEFINITION } from "@/lib/quiz/definition";
import { runQuizForInbound, type QuizInboundMessage } from "@/lib/quiz/orchestrator";
import { realQuizDeps } from "@/lib/quiz/deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kill-switch/rollout opcional: se setado, o quiz só começa pra contatos cuja
// primeira mensagem for a partir dessa data (ISO). Sem a var = quiz ligado.
// Data inválida é ignorada (quiz segue ligado) com aviso no log.
function parseQuizStartDate(): Date | null {
  const raw = process.env.QUIZ_START_DATE;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    console.warn(`QUIZ_START_DATE inválida ("${raw}") — ignorando, quiz segue ligado.`);
    return null;
  }
  return d;
}
const QUIZ_START_DATE = parseQuizStartDate();

type WaContact = { wa_id: string; profile?: { name?: string } };

type WaMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
  button?: { text?: string; payload?: string };
  context?: { id?: string };
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

/** Texto que o contato "disse" ao tocar num botão (resposta interativa ou quick reply). */
function buttonReplyText(msg: WaMessage): string | null {
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.title ??
      msg.interactive?.list_reply?.title ??
      null
    );
  }
  if (msg.type === "button") return msg.button?.text ?? null;
  return null;
}

function previewFor(msg: WaMessage) {
  if (msg.type === "text") return msg.text?.body ?? "";
  const buttonText = buttonReplyText(msg);
  if (buttonText) return buttonText;
  const caption = msg.image?.caption || msg.document?.caption;
  return caption || TYPE_LABELS[msg.type] || `[${msg.type}]`;
}

function extractContent(msg: WaMessage) {
  switch (msg.type) {
    case "text":
      return { body: msg.text?.body ?? "", mediaId: null, mimeType: null, filename: null };
    case "audio":
      return {
        body: null,
        mediaId: msg.audio?.id ?? null,
        mimeType: msg.audio?.mime_type ?? null,
        filename: null,
      };
    case "image":
      return {
        body: msg.image?.caption ?? null,
        mediaId: msg.image?.id ?? null,
        mimeType: msg.image?.mime_type ?? null,
        filename: null,
      };
    case "document":
      return {
        body: msg.document?.caption ?? null,
        mediaId: msg.document?.id ?? null,
        mimeType: msg.document?.mime_type ?? null,
        filename: msg.document?.filename ?? null,
      };
    default:
      return { body: previewFor(msg), mediaId: null, mimeType: null, filename: null };
  }
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
  if (!verifyMetaSignature(rawBody, signature, process.env.WHATSAPP_APP_SECRET)) {
    console.error("WhatsApp webhook: assinatura inválida");
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: { entry?: { changes?: { value: WaChangeValue }[] }[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Responde 200 rápido: o registro da mensagem roda inline (só banco), e o quiz
  // (que chama a Cloud API) é agendado com `after()` — sai da rota antes de enviar.
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

/** Normaliza a mensagem recebida no formato que o orquestrador do quiz espera. */
function toQuizInbound(msg: WaMessage): QuizInboundMessage {
  const br =
    msg.type === "interactive" && msg.interactive?.type === "button_reply"
      ? msg.interactive.button_reply
      : undefined;
  return {
    wamid: msg.id,
    buttonReply: br?.id ? { id: br.id, title: br.title ?? "" } : null,
    contextId: msg.context?.id ?? null,
  };
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

    // Idempotência: a Meta pode reentregar o mesmo webhook. Se essa mensagem já
    // foi registrada, não faz nada de novo (nem o incremento de não-lidas, nem o quiz).
    const already = await prisma.whatsAppMessage.findUnique({
      where: { waMessageId: msg.id },
      select: { id: true },
    });
    if (already) continue;

    const existingConversation = await prisma.whatsAppConversation.findUnique({
      where: { waId },
    });

    const conversation = existingConversation
      ? await prisma.whatsAppConversation.update({
          where: { waId },
          data: {
            ...(contactName ? { contactName } : {}),
            lastMessageAt: timestamp,
            lastMessagePreview: preview,
            unreadCount: { increment: 1 },
          },
        })
      : await prisma.whatsAppConversation.create({
          data: {
            waId,
            contactName: contactName ?? null,
            lastMessageAt: timestamp,
            lastMessagePreview: preview,
            unreadCount: 1,
          },
        });

    // Todo contato que manda a primeira mensagem no WhatsApp já vira um lead
    // em Triagem — assim ninguém que chama no WhatsApp fica de fora do funil.
    if (!existingConversation) {
      const lead = await prisma.lead.create({
        data: {
          nome: contactName || formatPhoneNumber(waId.replace(/^55/, "")) || waId,
          telefone: waId,
          origem: "WhatsApp",
          status: "Triagem",
          dataEntrada: timestamp,
          qtdVidas: 1,
        },
      });

      // Primeiro contato → cria o estado do quiz (a menos que o kill-switch
      // QUIZ_START_DATE esteja no futuro). `skipDuplicates` protege contra
      // duas primeiras mensagens simultâneas do mesmo número.
      const quizEnabled = !QUIZ_START_DATE || timestamp >= QUIZ_START_DATE;
      if (quizEnabled) {
        await prisma.whatsAppQuizState.createMany({
          data: [
            {
              conversationId: conversation.id,
              leadId: lead.id,
              currentStep: QUIZ_DEFINITION.primeiraPergunta,
            },
          ],
          skipDuplicates: true,
        });
      }
    }

    const content = extractContent(msg);

    try {
      await prisma.whatsAppMessage.create({
        data: {
          conversationId: conversation.id,
          waMessageId: msg.id,
          direction: "INBOUND",
          type: msg.type,
          body: content.body,
          mediaId: content.mediaId,
          mimeType: content.mimeType,
          filename: content.filename,
          timestamp,
        },
      });
    } catch (err) {
      // Corrida de reentrega: outra requisição gravou essa mensagem primeiro.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      throw err;
    }

    // Quiz: responde 200 primeiro; o processamento (que faz chamada à Cloud API)
    // roda depois. O orquestrador não faz nada se não houver quiz ativo.
    const quizInput = toQuizInbound(msg);
    after(() =>
      runQuizForInbound({ waId, message: quizInput }, realQuizDeps).catch((err) => {
        console.error(
          "[quiz] erro no processamento pós-resposta:",
          err instanceof Error ? err.message : err
        );
      })
    );
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

    // statuses não entram na lógica do quiz; só atualizamos a mensagem.
    if (status.status === "failed") {
      console.warn(`WhatsApp status failed p/ ${status.id}: ${status.errors?.[0]?.title ?? "sem detalhe"}`);
    }

    await prisma.whatsAppMessage.updateMany({
      where: { waMessageId: status.id },
      data: {
        status: mapped,
        errorMessage: status.errors?.[0]?.title ?? null,
      },
    });
  }
}
