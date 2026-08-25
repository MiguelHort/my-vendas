const GRAPH_VERSION = "v24.0";

export function normalizeWaId(phone: string) {
  return (phone || "").replace(/[^\d]/g, "");
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
    throw new Error(`Erro ao enviar WhatsApp (${res.status}): ${JSON.stringify(data)}`);
  }

  return data as { messages?: { id: string }[] };
}

export function sendWhatsAppText(to: string, text: string) {
  return sendWhatsAppMessage({ to, type: "text", text: { body: text, preview_url: false } });
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
