import { zavuProvider } from "@/lib/sdr/providers/zavu";

function normalizePhone(raw: string): string {
  return `+${raw.replace(/\D/g, "")}`;
}

export async function sendAlertWhatsApp(
  senderId: string,
  to: string,
  body: string,
): Promise<void> {
  try {
    await zavuProvider.sendText(senderId, normalizePhone(to), body);
  } catch (err) {
    console.error("[alerts] Erro ao enviar alerta via Zavu:", err);
  }
}
