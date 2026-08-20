import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { verifyFirebasePassword } from "@/lib/firebaseAuthRest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const password = body?.password as string | undefined;

  if (!password) {
    return NextResponse.json({ error: "Senha é obrigatória" }, { status: 400 });
  }

  let passwordOk: boolean;
  try {
    passwordOk = await verifyFirebasePassword(auth.user.email, password);
  } catch (err) {
    console.error("Erro ao validar senha:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao validar senha" },
      { status: 500 }
    );
  }

  if (!passwordOk) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const conversation = await prisma.whatsAppConversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  }

  await prisma.whatsAppConversation.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
