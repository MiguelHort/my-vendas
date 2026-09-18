import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lista enxuta de usuários aprovados da equipe — usada pra escolher responsável
 * em demandas (kanban interno) e outros seletores de "atribuir a alguém".
 * Diferente de `api/admin/users`: qualquer usuário logado pode chamar (não só
 * admin) e só devolve os campos necessários pra um seletor.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const users = await prisma.user.findMany({
    where: { approved: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({ id: u.id, name: u.name || u.email })),
  });
}
