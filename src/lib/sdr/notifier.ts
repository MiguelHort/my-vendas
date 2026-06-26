import type { ClassificationResult } from "./types";

interface HandoffPayload {
  corretor: { name: string | null; email: string };
  lead: { nome: string | null; telefone: string; leadId: string };
  classification: ClassificationResult;
}

/** Envia notificação de handoff ao corretor via WhatsApp Cloud API (Meta). */
async function sendWhatsAppHandoff(payload: HandoffPayload): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const notifyTo = process.env.WHATSAPP_NOTIFY_TO;

  if (!phoneNumberId || !token || !notifyTo) {
    console.warn("[SDR notifier] WHATSAPP_* envs não configuradas — handoff não enviado por WA");
    return;
  }

  const dados = payload.classification.dados_extraidos;
  const score = payload.classification.score;
  const cat = payload.classification.categoria;
  const motivos = payload.classification.motivos.join("; ");

  const body =
    `🔥 *Lead ${cat} — Score ${score}/100*\n` +
    `👤 ${payload.lead.nome ?? "Sem nome"} — ${payload.lead.telefone}\n` +
    `📍 ${dados.cidade_estado ?? "—"} | ${dados.tipo}\n` +
    `⚡ ${motivos}\n` +
    `📱 Abra o WinLeads para atender.`;

  try {
    const res = await fetch(
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
          type: "text",
          text: { body },
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[SDR notifier] WhatsApp API erro:", res.status, text);
    }
  } catch (err) {
    console.error("[SDR notifier] Erro ao enviar WhatsApp handoff:", err);
  }
}

/**
 * Dispara handoff ao corretor:
 * - Log no console (sempre)
 * - WhatsApp Cloud API (se configurado)
 */
export async function notifyHandoff(payload: HandoffPayload): Promise<void> {
  const { lead, classification } = payload;

  console.log(
    `[SDR handoff] Lead ${lead.leadId} — Categoria ${classification.categoria} Score ${classification.score}`,
  );

  await sendWhatsAppHandoff(payload);
}
