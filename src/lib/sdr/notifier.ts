import type { ClassificationResult } from "./types";

interface HandoffPayload {
  corretor: { name: string | null; email: string };
  lead: { nome: string | null; telefone: string; leadId: string };
  classification: ClassificationResult;
}

async function sendWhatsAppHandoff(payload: HandoffPayload): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const notifyTo = process.env.WHATSAPP_NOTIFY_TO;

  if (!phoneNumberId || !token || !notifyTo) {
    console.warn("[SDR notifier] WHATSAPP_* envs não configuradas — handoff não enviado por WA");
    return;
  }

  const { categoria, placar, flags, resumo_para_corretor } = payload.classification;
  const catEmoji: Record<string, string> = { A: "🔥", B: "✅", C: "⚠️", D: "❄️", E: "🚫" };

  const flagLines: string[] = [];
  if (flags.risco_saude) flagLines.push("⚕️ Risco saúde — possível CPT");
  if (flags.alerta_adverso) flagLines.push("🚨 Alerta: possível seleção adversa");

  const body =
    `${catEmoji[categoria] ?? "📋"} *Lead ${categoria} — Score ${placar.total}/100*\n` +
    `📱 ${payload.lead.telefone}\n` +
    (resumo_para_corretor ? `\n${resumo_para_corretor}\n` : "") +
    (flagLines.length ? `\n${flagLines.join("\n")}\n` : "") +
    `\n📲 Abra o WinLeads para atender.`;

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

export async function notifyHandoff(payload: HandoffPayload): Promise<void> {
  const { lead, classification } = payload;
  console.log(
    `[SDR handoff] Lead ${lead.leadId} — Categoria ${classification.categoria} Score ${classification.placar.total}`,
  );
  await sendWhatsAppHandoff(payload);
}
