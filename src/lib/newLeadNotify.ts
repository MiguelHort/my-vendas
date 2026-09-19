import { normalizeWaId, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { formatPhoneNumber } from "@/lib/phoneMask";

// Quem recebe o aviso de "novo lead". Pode ser trocado via env sem mexer no código.
const NOTIFY_TO = normalizeWaId(process.env.WHATSAPP_NEW_LEAD_NOTIFY_TO || "5547996119962");

const NOT_INFORMED = "Não informado";

/**
 * Avisa a equipe (template aprovado `new_lead`) que um contato novo mandou mensagem
 * no WhatsApp. Best-effort: falha só vai pro log, nunca derruba o webhook.
 * Contatos que chegam pelo WhatsApp não têm cidade/UF ainda — o template exige os
 * 4 parâmetros, então vai "Não informado".
 */
export async function notifyNewWhatsAppLead(lead: { name: string | null; waId: string }) {
  // O próprio número de aviso conversando com o sistema não pode gerar aviso (loop).
  if (normalizeWaId(lead.waId) === NOTIFY_TO) return;

  const phone = formatPhoneNumber(lead.waId.replace(/^55/, "")) || lead.waId;

  try {
    await sendWhatsAppTemplate(NOTIFY_TO, "new_lead", "pt_BR", [
      { name: "name", value: lead.name || NOT_INFORMED },
      { name: "phone", value: phone },
      { name: "city", value: NOT_INFORMED },
      { name: "uf", value: NOT_INFORMED },
    ]);
  } catch (err) {
    console.error(
      "[new-lead-notify] falha ao avisar novo lead:",
      err instanceof Error ? err.message : err
    );
  }
}
