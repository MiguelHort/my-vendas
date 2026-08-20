import crypto from "crypto";

const GRAPH_VERSION = "v24.0";

export function normalizeWaId(phone: string) {
  return (phone || "").replace(/[^\d]/g, "");
}

export async function sendWhatsAppText(to: string, text: string) {
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
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text, preview_url: false },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Erro ao enviar WhatsApp (${res.status}): ${JSON.stringify(data)}`);
  }

  return data as { messages?: { id: string }[] };
}

/**
 * Verifica X-Hub-Signature-256 contra o corpo bruto da requisição.
 * A Meta assina o payload com o App Secret do app conectado ao número.
 * Sem WHATSAPP_APP_SECRET configurado, a validação é pulada (não recomendado em produção).
 */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true;
  if (!signatureHeader) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
