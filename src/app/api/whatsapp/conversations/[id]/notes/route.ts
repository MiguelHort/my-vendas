import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NOTES_LENGTH = 5000;

/** Salva as observações internas da conversa (texto vazio limpa o campo). */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  if (typeof body?.notes !== "string") {
    return NextResponse.json({ error: "notes deve ser texto" }, { status: 400 });
  }

  const notes = body.notes.trim();
  if (notes.length > MAX_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `Observações muito longas (máx. ${MAX_NOTES_LENGTH} caracteres)` },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.whatsAppConversation.update({
      where: { id },
      data: { notes: notes || null },
      select: { notes: true },
    });
    return NextResponse.json({ notes: updated.notes });
  } catch {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }
}
