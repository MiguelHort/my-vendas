/**
 * Casamento de conversa (wa_id) com lead pelo telefone.
 *
 * Não existe FK entre WhatsAppConversation e Lead — o vínculo é pelo número.
 * Leads cadastrados manualmente às vezes têm o telefone sem o código do país,
 * então comparamos só os últimos 8 dígitos (número do assinante, sem DDD/DDI).
 */

export function onlyDigits(phone: string | null | undefined) {
  return (phone || "").replace(/\D/g, "");
}

export function localNumber(digits: string) {
  return digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
}

export function phoneSuffix(phone: string | null | undefined) {
  const local = localNumber(onlyDigits(phone));
  return local.length >= 8 ? local.slice(-8) : "";
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined) {
  const sa = phoneSuffix(a);
  const sb = phoneSuffix(b);
  return sa !== "" && sa === sb;
}
