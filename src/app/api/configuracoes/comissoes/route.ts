import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";

export const runtime = "nodejs";

const OPERADORAS_DEFAULT = [
  "Amil",
  "Bradesco Saúde",
  "Hapvida",
  "LevMed",
  "Nossa Saúde",
  "SulAmérica",
  "Unimed",
  "Select",
  "Notre Dame",
  "Clinipam"
];

function getAuthParams(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return {
    firebaseUid: searchParams.get("firebaseUid"),
    email: searchParams.get("email"),
    name: searchParams.get("name"),
  };
}

export async function GET(req: NextRequest) {
  const { firebaseUid, email, name } = getAuthParams(req);
  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  try {
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    const existing = await prisma.planCommission.findMany({
      where: { userId: user.id },
    });

    const existingMap = new Map(existing.map((r) => [r.operadora, r]));

    // Garante que todas as operadoras existam (upsert lazy)
    const missing = OPERADORAS_DEFAULT.filter((op) => !existingMap.has(op));
    if (missing.length > 0) {
      await prisma.planCommission.createMany({
        data: missing.map((op) => ({
          userId: user.id,
          operadora: op,
          comissaoInterna: 100,
          comissaoExterna: 100,
        })),
        skipDuplicates: true,
      });
    }

    const all = await prisma.planCommission.findMany({
      where: { userId: user.id },
      orderBy: { operadora: "asc" },
    });

    return NextResponse.json(
      all.map((r) => ({
        id: r.id,
        operadora: r.operadora,
        comissao_interna: Number(r.comissaoInterna),
        comissao_externa: Number(r.comissaoExterna),
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { firebaseUid, email, name } = getAuthParams(req);
  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.operadora) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { operadora, comissao_interna, comissao_externa } = body;

  try {
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    const updated = await prisma.planCommission.upsert({
      where: { userId_operadora: { userId: user.id, operadora } },
      update: {
        ...(comissao_interna !== undefined && {
          comissaoInterna: Number(comissao_interna),
        }),
        ...(comissao_externa !== undefined && {
          comissaoExterna: Number(comissao_externa),
        }),
      },
      create: {
        userId: user.id,
        operadora,
        comissaoInterna: comissao_interna !== undefined ? Number(comissao_interna) : 100,
        comissaoExterna: comissao_externa !== undefined ? Number(comissao_externa) : 100,
      },
    });

    return NextResponse.json({
      id: updated.id,
      operadora: updated.operadora,
      comissao_interna: Number(updated.comissaoInterna),
      comissao_externa: Number(updated.comissaoExterna),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}
