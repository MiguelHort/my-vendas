import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { phoneSuffix } from "@/lib/leadMatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Acha o lead cujo telefone bate com o número da conversa, pra mostrar
 * operadora ofertada / valor da mensalidade / etiquetas no cabeçalho do chat.
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

  const waSuffix = phoneSuffix(conversation.waId);

  const candidates = await prisma.lead.findMany({
    where: { telefone: { not: null } },
    select: {
      id: true,
      status: true,
      operadoraOfertada: true,
      valorMensalidade: true,
      telefone: true,
      tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const match = waSuffix
    ? candidates.find((l) => phoneSuffix(l.telefone) === waSuffix)
    : undefined;

  if (!match) {
    return NextResponse.json({ lead: null });
  }

  return NextResponse.json({
    lead: {
      id: match.id,
      status: match.status,
      operadora_ofertada: match.operadoraOfertada,
      valor_mensalidade: match.valorMensalidade != null ? Number(match.valorMensalidade) : null,
      tags: match.tags.map((r) => ({ id: r.tag.id, name: r.tag.name, color: r.tag.color })),
    },
  });
}
