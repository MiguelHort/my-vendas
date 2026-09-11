/**
 * DEV: apaga o estado do quiz + o registro de contato de um número de teste,
 * pra repetir o fluxo do quiz quantas vezes quiser.
 *
 *   npx tsx scripts/reset-quiz-contato.ts 5547999998888
 *   npx tsx scripts/reset-quiz-contato.ts 5547999998888 --keep-lead
 *
 * Apaga: whatsapp_quiz_states, whatsapp_messages e whatsapp_conversations do
 * número; e, por padrão, o lead auto-criado (origem "WhatsApp") que casa por
 * telefone. Use --keep-lead pra preservar o lead.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const arg = process.argv[2];
const keepLead = process.argv.includes("--keep-lead");

if (!arg) {
  console.error("uso: npx tsx scripts/reset-quiz-contato.ts <telefone> [--keep-lead]");
  process.exit(1);
}

const digits = arg.replace(/\D/g, "");
const suffix8 = digits.slice(-8);
const candidateWaIds = Array.from(
  new Set([
    digits,
    digits.startsWith("55") ? digits.slice(2) : `55${digits}`,
    digits.length === 11 ? `55${digits}` : digits,
  ])
);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const conv = await prisma.whatsAppConversation.findFirst({
    where: { waId: { in: candidateWaIds } },
  });

  if (conv) {
    // O FK de quiz/mensagens é ON DELETE CASCADE, mas apagamos explícito p/ clareza.
    const quiz = await prisma.whatsAppQuizState.deleteMany({ where: { conversationId: conv.id } });
    const msgs = await prisma.whatsAppMessage.deleteMany({ where: { conversationId: conv.id } });
    await prisma.whatsAppConversation.delete({ where: { id: conv.id } });
    console.log(
      `conversa ${conv.waId} apagada (${msgs.count} mensagens, ${quiz.count} estado de quiz).`
    );
  } else {
    console.log(`nenhuma conversa encontrada para: ${candidateWaIds.join(", ")}`);
  }

  if (!keepLead) {
    const leads = await prisma.lead.findMany({
      where: { origem: "WhatsApp", telefone: { not: null } },
      select: { id: true, nome: true, telefone: true },
    });
    const alvo = leads.filter(
      (l) => (l.telefone || "").replace(/\D/g, "").slice(-8) === suffix8
    );
    for (const l of alvo) {
      await prisma.lead.delete({ where: { id: l.id } });
      console.log(`lead apagado: ${l.id} (${l.nome}).`);
    }
    if (alvo.length === 0) console.log("nenhum lead WhatsApp casando pelo telefone.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
