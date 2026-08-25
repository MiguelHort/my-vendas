const GRAPH_VERSION = "v24.0";

function requireEnv() {
  const igId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  if (!igId || !token) {
    throw new Error(
      "INSTAGRAM_BUSINESS_ACCOUNT_ID / INSTAGRAM_PAGE_ACCESS_TOKEN não configurados"
    );
  }
  return { igId, token };
}

async function sendInstagramMessage(payload: Record<string, unknown>) {
  const { igId, token } = requireEnv();

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${igId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Erro ao enviar Instagram (${res.status}): ${JSON.stringify(data)}`);
  }

  return data as { message_id?: string };
}

export function sendInstagramText(igsid: string, text: string) {
  return sendInstagramMessage({ recipient: { id: igsid }, message: { text } });
}

export function sendInstagramAttachment(
  igsid: string,
  attachmentType: "image" | "audio" | "video" | "file",
  attachmentId: string
) {
  return sendInstagramMessage({
    recipient: { id: igsid },
    message: { attachment: { type: attachmentType, payload: { attachment_id: attachmentId } } },
  });
}

/**
 * Sobe um arquivo reusável (attachment_id) pra depois mandar com sendInstagramAttachment.
 * É a Attachment Upload API do Messenger Platform adaptada pra Instagram — não foi
 * testada contra uma conta real ainda (diferente do WhatsApp, onde já vimos funcionar
 * de ponta a ponta). Se o endpoint/formato mudar quando testarem, é aqui que ajusta.
 */
export async function uploadInstagramAttachment(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  attachmentType: "image" | "audio" | "video" | "file"
) {
  const { igId, token } = requireEnv();

  const form = new FormData();
  form.append(
    "message",
    JSON.stringify({ attachment: { type: attachmentType, payload: { is_reusable: true } } })
  );
  form.append("filedata", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${igId}/message_attachments`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Erro ao subir mídia Instagram (${res.status}): ${JSON.stringify(data)}`);
  }

  return data.attachment_id as string;
}

/**
 * Baixa uma mídia recebida do Instagram. Diferente do WhatsApp, o próprio evento do
 * webhook já vem com uma URL assinada e pronta pra usar — não tem token/media-id
 * pra resolver antes, é só baixar direto.
 */
export async function downloadInstagramMedia(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Erro ao baixar mídia Instagram (${res.status})`);
  }
  const mimeType = res.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

/**
 * Busca nome/username do contato pelo IGSID (User Profile API). Requer permissão
 * aprovada no app da Meta — se falhar (permissão ausente, conta não encontrada etc.),
 * devolve null e quem chamar cai pro fallback (mostrar só o IGSID).
 */
export async function fetchInstagramProfile(igsid: string) {
  const token = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${igsid}?fields=name,username&access_token=${token}`
    );
    if (!res.ok) return null;
    return (await res.json()) as { name?: string; username?: string };
  } catch {
    return null;
  }
}
