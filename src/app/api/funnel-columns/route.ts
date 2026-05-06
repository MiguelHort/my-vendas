import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";

export const runtime = "nodejs";

function authParams(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  return {
    firebaseUid: p.get("firebaseUid"),
    email: p.get("email"),
    name: p.get("name") ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const { firebaseUid, email, name } = authParams(req);
  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  try {
    const user = await getOrCreateUserByFirebaseUid({ firebaseUid, email, name });

    const rows = await prisma.funnelColumn.findMany({
      where: { userId: user.id },
      orderBy: { position: "asc" },
    });

    const columns = rows.map((r) => ({
      id: r.colId,
      title: r.title,
      color: r.color,
    }));

    return NextResponse.json({ columns });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao buscar colunas" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { firebaseUid, email, name } = authParams(req);
  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.columns)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const columns: { id: string; title: string; color: string }[] = body.columns;

  try {
    const user = await getOrCreateUserByFirebaseUid({ firebaseUid, email, name });

    await prisma.$transaction(async (tx) => {
      await tx.funnelColumn.deleteMany({ where: { userId: user.id } });

      if (columns.length > 0) {
        await tx.funnelColumn.createMany({
          data: columns.map((col, i) => ({
            userId: user.id,
            colId: col.id,
            title: col.title,
            color: col.color,
            position: i,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao salvar colunas" }, { status: 500 });
  }
}
