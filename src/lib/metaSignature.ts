import crypto from "crypto";

/**
 * Verifica X-Hub-Signature-256 contra o corpo bruto da requisição.
 * A Meta assina o payload com o App Secret do app conectado ao webhook
 * (mesmo mecanismo pros webhooks de WhatsApp e de Instagram/Messenger).
 * Sem appSecret configurado, a validação é pulada (não recomendado em produção).
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined
) {
  if (!appSecret) return true;
  if (!signatureHeader) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
