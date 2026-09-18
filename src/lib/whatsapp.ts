import { translateWhatsAppErrorTitle } from "./whatsappErrors";

const GRAPH_VERSION = "v24.0";

export function normalizeWaId(phone: string) {
  return (phone || "").replace(/[^\d]/g, "");
}

/**
 * Erro de envio pela Cloud API, com os campos estruturados da Meta expostos
 * (código, subcódigo) além da mensagem legível. Callers antigos continuam
 * funcionando via `.message`.
 */
export class WhatsAppSendError extends Error {
  readonly status: number;
  readonly metaCode: number | null;
  readonly metaSubcode: number | null;
  /** Título curto da Meta (ex: "Re-engagement message") — o que a Meta manda como `error.title`. */
  readonly metaTitle: string | null;

  constructor(status: number, data: unknown) {
    super(`Erro ao enviar WhatsApp (${status}): ${JSON.stringify(data)}`);
    this.name = "WhatsAppSendError";
    this.status = status;
    const err = (data as { error?: { code?: number; error_subcode?: number; error_data?: { details?: string }; title?: string; message?: string } })?.error;
    this.metaCode = typeof err?.code === "number" ? err.code : null;
    this.metaSubcode = typeof err?.error_subcode === "number" ? err.error_subcode : null;
    this.metaTitle = err?.title ?? err?.error_data?.details ?? err?.message ?? null;
  }

  /** Mensagem amigável (PT) pro corretor — traduz os casos mais comuns, senão devolve o título cru da Meta. */
  get friendlyMessage(): string {
    return translateWhatsAppErrorTitle(this.metaCode, this.metaTitle);
  }
}

async function sendWhatsAppMessage(payload: Record<string, unknown>) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TOKEN não configurados");
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new WhatsAppSendError(res.status, data);
  }

  return data as {
    messages?: { id: string }[];
    // A Meta devolve o wa_id CANÔNICO que ela vai usar pras próximas mensagens
    // desse número — pode diferir do que a gente mandou em `to` (números BR às
    // vezes têm o "9" a mais/a menos dependendo de onde vieram). Usar esse
    // valor pra gravar a conversa é o que evita duplicar contato quando ele responde.
    contacts?: { input: string; wa_id: string }[];
  };
}

export type WhatsAppReplyButton = { id: string; title: string };

/**
 * Mensagem `interactive` do tipo `button` (até 3 botões).
 * A validação de limites vive em `lib/quiz/validate.ts` (roda na inicialização).
 */
export function sendWhatsAppInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: WhatsAppReplyButton[]
) {
  return sendWhatsAppMessage({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

export function sendWhatsAppText(to: string, text: string) {
  return sendWhatsAppMessage({ to, type: "text", text: { body: text, preview_url: false } });
}

export type WhatsAppTemplateParam = {
  /** presente = template com placeholders nomeados ({{nome}}); ausente = posicionais ({{1}}). */
  name?: string;
  value: string;
};

/**
 * Mensagem `template` (HSM) — o único tipo que a Meta aceita fora da janela de
 * 24h desde a última mensagem do contato (ver `WhatsAppSendError.friendlyMessage`).
 * O template precisa já existir aprovado na conta (ver `fetchWhatsAppTemplates`).
 */
export function sendWhatsAppTemplate(
  to: string,
  name: string,
  languageCode: string,
  bodyParams: WhatsAppTemplateParam[] = []
) {
  return sendWhatsAppMessage({
    to,
    type: "template",
    template: {
      name,
      language: { code: languageCode },
      ...(bodyParams.length > 0
        ? {
            components: [
              {
                type: "body",
                parameters: bodyParams.map((p) =>
                  p.name
                    ? { type: "text", parameter_name: p.name, text: p.value }
                    : { type: "text", text: p.value }
                ),
              },
            ],
          }
        : {}),
    },
  });
}

export type WhatsAppTemplateInfo = {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  bodyText: string | null;
  /** nomes/índices dos placeholders `{{...}}` encontrados no corpo, na ordem em que aparecem. */
  paramTokens: string[];
  /** true se os placeholders são nomeados ({{nome}}); false se posicionais ({{1}}) ou sem placeholder. */
  paramsAreNamed: boolean;
};

/**
 * Lista os Message Templates da conta (WhatsApp Business Account), aprovados ou
 * não. Usado pra montar a UI de "enviar modelo" quando a janela de 24h fechou.
 */
export async function fetchWhatsAppTemplates(): Promise<WhatsAppTemplateInfo[]> {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!wabaId || !token) {
    throw new Error("WHATSAPP_BUSINESS_ACCOUNT_ID / WHATSAPP_TOKEN não configurados");
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/message_templates?fields=name,status,category,language,components&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Erro ao listar templates do WhatsApp (${res.status}): ${JSON.stringify(data)}`);
  }

  type RawTemplate = {
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
    components?: { type: string; text?: string }[];
  };

  return ((data.data ?? []) as RawTemplate[]).map((t) => {
    const bodyText = t.components?.find((c) => c.type === "BODY")?.text ?? null;
    const tokens = bodyText ? [...bodyText.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1].trim()) : [];
    const paramsAreNamed = tokens.length > 0 && !/^\d+$/.test(tokens[0]);
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      category: t.category,
      language: t.language,
      bodyText,
      paramTokens: tokens,
      paramsAreNamed,
    };
  });
}

export function sendWhatsAppAudio(to: string, mediaId: string) {
  return sendWhatsAppMessage({ to, type: "audio", audio: { id: mediaId } });
}

export function sendWhatsAppImage(to: string, mediaId: string, caption?: string) {
  return sendWhatsAppMessage({
    to,
    type: "image",
    image: { id: mediaId, ...(caption ? { caption } : {}) },
  });
}

export function sendWhatsAppDocument(
  to: string,
  mediaId: string,
  filename: string,
  caption?: string
) {
  return sendWhatsAppMessage({
    to,
    type: "document",
    document: { id: mediaId, filename, ...(caption ? { caption } : {}) },
  });
}

/**
 * Sobe um arquivo pro WhatsApp (endpoint de mídia) e devolve o media id
 * que pode ser usado em `sendWhatsAppAudio` / outros tipos de mensagem com mídia.
 */
export async function uploadWhatsAppMedia(buffer: Buffer, mimeType: string, filename: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TOKEN não configurados");
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Erro ao subir mídia WhatsApp (${res.status}): ${JSON.stringify(data)}`);
  }

  return data.id as string;
}

/**
 * Baixa uma mídia recebida/enviada pelo WhatsApp a partir do media id.
 * A Cloud API só devolve uma URL temporária (curta duração) — por isso
 * resolvemos a URL e já baixamos os bytes na mesma chamada, sempre que for tocar.
 */
export async function downloadWhatsAppMedia(mediaId: string) {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) throw new Error("WHATSAPP_TOKEN não configurado");

  const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    throw new Error(`Erro ao resolver mídia WhatsApp (${metaRes.status})`);
  }
  const meta = (await metaRes.json()) as { url: string; mime_type: string };

  const fileRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!fileRes.ok) {
    throw new Error(`Erro ao baixar mídia WhatsApp (${fileRes.status})`);
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType: meta.mime_type };
}
