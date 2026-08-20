import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function onlyDigits(phone: string) {
  return (phone || "").replace(/\D/g, "");
}

// Remove o código do país (55) quando presente, pra comparar só DDD+número —
// leads cadastrados manualmente às vezes têm o telefone sem o "55" na frente.
function localNumber(digits: string) {
  return digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
}

/**
 * Acha o lead cujo telefone bate com o número da conversa, pra mostrar
 * operadora ofertada / valor da mensalidade no cabeçalho do chat.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  const conversation = await prisma.whatsAppConversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  const waLocal = localNumber(onlyDigits(conversation.waId));

  const candidates = await prisma.lead.findMany({
    where: { telefone: { not: null } },
    select: {
      id: true,
      status: true,
      operadoraOfertada: true,
      valorMensalidade: true,
      telefone: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const match = candidates.find((l) => {
    const leadLocal = localNumber(onlyDigits(l.telefone || ""));
    return leadLocal.length >= 8 && waLocal.length >= 8 && leadLocal.slice(-8) === waLocal.slice(-8);
  });

  if (!match) {
    return NextResponse.json({ lead: null });
  }

  return NextResponse.json({
    lead: {
      id: match.id,
      status: match.status,
      operadora_ofertada: match.operadoraOfertada,
      valor_mensalidade: match.valorMensalidade != null ? Number(match.valorMensalidade) : null,
    },
  });
}
