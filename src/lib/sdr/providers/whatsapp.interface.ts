export interface WhatsAppProvider {
  /** Verifica se o sender está ativo e acessível via API */
  getStatus(senderId: string): Promise<"active" | "inactive">;

  /** Envia mensagem de texto (to = número E.164 do lead, ex: "+5547999990000") */
  sendText(senderId: string, to: string, text: string): Promise<void>;
}
