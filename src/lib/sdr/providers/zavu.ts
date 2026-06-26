import type { WhatsAppProvider } from "./whatsapp.interface";

const BASE_URL = "https://api.zavu.dev/v1";

function apiKey(): string {
  const key = process.env.ZAVU_API_KEY;
  if (!key) throw new Error("ZAVU_API_KEY não configurada");
  return key;
}

function authHeaders(senderId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey()}`,
  };
  if (senderId) headers["Zavu-Sender"] = senderId;
  return headers;
}

export class ZavuProvider implements WhatsAppProvider {
  async getStatus(senderId: string): Promise<"active" | "inactive"> {
    try {
      const res = await fetch(`${BASE_URL}/senders/${senderId}`, {
        headers: authHeaders(),
      });
      return res.ok ? "active" : "inactive";
    } catch {
      return "inactive";
    }
  }

  async sendText(senderId: string, to: string, text: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/messages`, {
      method: "POST",
      headers: authHeaders(senderId),
      body: JSON.stringify({
        to,
        text,
        channel: "whatsapp",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new Error(`Zavu sendText [${senderId}] → ${res.status}: ${detail}`);
    }
  }
}

export const zavuProvider = new ZavuProvider();
