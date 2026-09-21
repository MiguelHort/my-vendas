/**
 * Casamento de conversa (wa_id) com lead pelo telefone.
 *
 * Não existe FK entre WhatsAppConversation e Lead — o vínculo é pelo número.
 * Leads cadastrados manualmente às vezes têm o telefone sem o código do país,
 * então comparamos só os últimos 8 dígitos (número do assinante, sem DDD/DDI).
 */

import { prisma } from "@/lib/prisma";

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

/**
 * Marca o lead vinculado a esse `wa_id` como "chamado agora" (`lastChamadoAt`),
 * igual o botão "Marcar chamado" no funil — chamado automaticamente sempre que
 * um atendente manda mensagem pro contato pelo inbox do WhatsApp (texto, áudio,
 * mídia ou modelo). Não lança erro se não achar lead — quem chama decide se
 * isso deve interromper o envio (normalmente não deve).
 */
export async function markLeadChamado(waId: string): Promise<void> {
  const suffix = phoneSuffix(waId);
  if (!suffix) return;

  const candidates = await prisma.lead.findMany({
    where: { telefone: { not: null } },
    select: { id: true, telefone: true },
    orderBy: { createdAt: "desc" },
  });
  const leadId = candidates.find((l) => phoneSuffix(l.telefone) === suffix)?.id;
  if (!leadId) return;

  await prisma.lead.update({ where: { id: leadId }, data: { lastChamadoAt: new Date() } });
}

/**
 * Sufixos de telefone (ver `phoneSuffix`) dos contatos cujo lead está em
 * "Dispensado" no funil — essas conversas saem do inbox do WhatsApp. Quando há
 * mais de um lead com o mesmo número, vale o mais recente (mesma regra das tags).
 */
export async function getDispensedPhoneSuffixes(): Promise<Set<string>> {
  const leads = await prisma.lead.findMany({
    where: { telefone: { not: null } },
    select: { telefone: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const seen = new Set<string>();
  const dispensed = new Set<string>();
  for (const l of leads) {
    const suffix = phoneSuffix(l.telefone);
    if (!suffix || seen.has(suffix)) continue;
    seen.add(suffix);
    if (l.status === "Dispensado") dispensed.add(suffix);
  }
  return dispensed;
}
