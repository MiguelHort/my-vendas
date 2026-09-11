import {
  sendWhatsAppInteractiveButtons,
  sendWhatsAppText,
  WhatsAppSendError,
} from "@/lib/whatsapp";
import type { QuizOutboundAction } from "./types";

export type QuizSendResult =
  | { ok: true; wamid: string | null }
  | { ok: false; status: number | null; metaCode: number | null; message: string };

/** Executa uma ação de saída do motor. Injetável — os testes passam um fake. */
export interface QuizSender {
  send(to: string, action: QuizOutboundAction): Promise<QuizSendResult>;
}

export const realQuizSender: QuizSender = {
  async send(to, action) {
    try {
      const result =
        action.type === "send_question"
          ? await sendWhatsAppInteractiveButtons(to, action.body, action.buttons)
          : await sendWhatsAppText(to, action.body);
      return { ok: true, wamid: result.messages?.[0]?.id ?? null };
    } catch (err) {
      if (err instanceof WhatsAppSendError) {
        return { ok: false, status: err.status, metaCode: err.metaCode, message: err.message };
      }
      return {
        ok: false,
        status: null,
        metaCode: null,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
