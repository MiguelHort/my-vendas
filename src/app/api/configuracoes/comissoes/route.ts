import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";
import { MODALIDADES } from "@/lib/commissions";

export const runtime = "nodejs";

const OPERADORAS_DEFAULT = [
  "Amil",
  "Bradesco Saúde",
  "Hapvida",
  "LevMed",
  "Nossa Saúde",
  "Pladisa",
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

/**
 * Comissão global por operadora + modalidade (PF/PME/Adesão/Empresarial) —
 * não é mais por usuário nem interno/externo (removido em 2026-09-18).
 */
export async function GET(req: NextRequest) {
  const { firebaseUid, email, name } = getAuthParams(req);
  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  try {
    await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    const existing = await prisma.commissionRate.findMany();
    const existingKeys = new Set(existing.map((r) => `${r.operadora}|${r.modalidade}`));

    // Garante que toda combinação operadora×modalidade exista (upsert lazy).
    const missing: { operadora: string; modalidade: string }[] = [];
    for (const operadora of OPERADORAS_DEFAULT) {
      for (const modalidade of MODALIDADES) {
        if (!existingKeys.has(`${operadora}|${modalidade}`)) {
          missing.push({ operadora, modalidade });
        }
      }
    }
    if (missing.length > 0) {
      await prisma.commissionRate.createMany({
        data: missing.map((m) => ({ operadora: m.operadora, modalidade: m.modalidade, percentual: 100 })),
        skipDuplicates: true,
      });
    }

    const all = await prisma.commissionRate.findMany({
      orderBy: [{ operadora: "asc" }, { modalidade: "asc" }],
    });

    return NextResponse.json(
      all.map((r) => ({
        id: r.id,
        operadora: r.operadora,
        modalidade: r.modalidade,
        percentual: Number(r.percentual),
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
  if (!body || !body.operadora || !body.modalidade) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { operadora, modalidade, percentual } = body;

  try {
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const updated = await prisma.commissionRate.upsert({
      where: { operadora_modalidade: { operadora, modalidade } },
      update: {
        ...(percentual !== undefined && { percentual: Number(percentual) }),
      },
      create: {
        operadora,
        modalidade,
        percentual: percentual !== undefined ? Number(percentual) : 100,
      },
    });

    return NextResponse.json({
      id: updated.id,
      operadora: updated.operadora,
      modalidade: updated.modalidade,
      percentual: Number(updated.percentual),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 });
  }
}
