import { NextRequest, NextResponse } from "next/server";

type FieldData = { name: string; values: string[] };

function getField(fieldData: FieldData[], fieldName: string) {
  const found = fieldData?.find((f) => f.name === fieldName);
  return found?.values?.[0] ?? "";
}

function normalizePhone(phone: string) {
  // Meta pode mandar com +55, espaços, parênteses etc
  return (phone || "").replace(/[^\d]/g, "");
}

async function fetchLeadFromMeta(leadId: string) {
  const token = process.env.META_PAGE_ACCESS_TOKEN; // token com leads_retrieval
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN não configurado");

  const url = `https://graph.facebook.com/v24.0/${leadId}?fields=created_time,field_data&access_token=${token}`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao buscar lead (${res.status}): ${text}`);
  }

  return res.json() as Promise<{
    created_time: string;
    field_data: FieldData[];
  }>;
}

async function sendWhatsappTemplate(params: {
  nome: string;
  telefone: string;
  cidade: string;
  estado: string;
}) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const notifyTo = process.env.WHATSAPP_NOTIFY_TO; // número destino (E.164)
  if (!phoneNumberId || !token || !notifyTo) {
    throw new Error("WHATSAPP_* envs não configuradas");
  }

  const { nome, telefone, cidade, estado } = params;

  const response = await fetch(
    `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: notifyTo,
        type: "template",
        template: {
          name: "new_lead",
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: nome || "Não informado", parameter_name: "name" },
                { type: "text", text: telefone || "Não informado", parameter_name: "phone" },
                { type: "text", text: cidade || "Não informado", parameter_name: "city" },
                { type: "text", text: estado || "Não informado", parameter_name: "uf" },
              ],
            },
          ],
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ao enviar WhatsApp (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * GET = verificação do webhook (Meta)
 * POST = eventos (leadgen)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Invalid verify token", { status: 403 });
}

export async function POST(req: NextRequest) {
  // Segurança básica (opcional, mas recomendado): valida X-Hub-Signature-256
  // Para simplificar aqui, vou deixar sem. Posso te passar com assinatura depois.

  const body = await req.json();

  // Estrutura típica: entry[0].changes[0].value.leadgen_id
  const changes = body?.entry?.flatMap((e: any) => e.changes ?? []) ?? [];
  const leadEvents = changes
    .map((c: any) => c?.value)
    .filter((v: any) => v?.leadgen_id);

  // Sempre responde 200 rápido pro Meta não tentar reenviar
  // Mas a gente ainda vai processar aqui (pode migrar pra fila depois)
  try {
    for (const ev of leadEvents) {
      const leadId = ev.leadgen_id as string;

      const lead = await fetchLeadFromMeta(leadId);
      const fieldData = lead.field_data ?? [];

      // Campos comuns do Lead Ads (dependem do seu formulário)
      const nome =
        getField(fieldData, "full_name") ||
        getField(fieldData, "name") ||
        getField(fieldData, "first_name");

      const telefoneRaw =
        getField(fieldData, "phone_number") ||
        getField(fieldData, "telefone") ||
        getField(fieldData, "phone");

      const cidade =
        getField(fieldData, "city") ||
        getField(fieldData, "cidade");

      const estado =
        getField(fieldData, "state") ||
        getField(fieldData, "uf") ||
        getField(fieldData, "estado");

      const telefone = normalizePhone(telefoneRaw);

      await sendWhatsappTemplate({ nome, telefone, cidade, estado });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Erro webhook lead:", err?.message || err);
    // Ainda devolve 200, pra evitar loop de retry do Meta (depende da sua estratégia)
    return NextResponse.json({ ok: true, error: "processed_with_error" });
  }
}
