/**
 * Tradução de erros de envio da Cloud API pra uma frase que o corretor entenda.
 * Módulo puro (sem `fetch`/`process.env`) — pode ser importado tanto no servidor
 * (`lib/whatsapp.ts`) quanto em componentes de cliente (mostrar o motivo de uma
 * mensagem FAILED no inbox), sem puxar código server-only pro bundle do browser.
 *
 * O caso mais comum de longe é a janela de 24h: a Meta só deixa mandar mensagem
 * de texto livre até 24h depois da ÚLTIMA mensagem do contato — depois disso só
 * um Message Template aprovado reabre a conversa (regra da plataforma, não um
 * bug; não dá pra contornar sem template).
 */
export function translateWhatsAppErrorTitle(
  metaCode: number | null,
  metaTitle: string | null
): string {
  // 131047 confirmado em produção nesta conta (2026-09-17). Os outros códigos
  // abaixo são conhecidos/documentados pela Meta mas não foram vistos aqui ainda.
  if (metaCode === 131047 || metaTitle === "Re-engagement message") {
    return "Mais de 24h desde a última mensagem do contato — a Meta só permite responder com um modelo (template) aprovado a partir daqui.";
  }
  if (metaCode === 131026) {
    return "O número do contato não está mais registrado no WhatsApp ou não pode receber mensagens.";
  }
  if (metaCode === 131053 || metaCode === 131052) {
    return "Falha ao processar a mídia enviada.";
  }
  return metaTitle || "Falha ao enviar a mensagem pelo WhatsApp.";
}
