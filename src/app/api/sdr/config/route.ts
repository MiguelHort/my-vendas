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

/** GET — retorna a config SDR do corretor (cria default se não existir) */
export async function GET(req: NextRequest) {
  const { firebaseUid, email, name } = authParams(req);
  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const user = await getOrCreateUserByFirebaseUid({ firebaseUid, email, name });

  const config = await prisma.sdrConfig.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  return NextResponse.json({ config });
}

/** PUT — atualiza a config SDR do corretor */
export async function PUT(req: NextRequest) {
  const { firebaseUid, email, name } = authParams(req);
  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const user = await getOrCreateUserByFirebaseUid({ firebaseUid, email, name });

  const data: {
    enabled?: boolean;
    nomeAssistente?: string;
    saudacao?: string | null;
    tom?: string;
    handoffMinCategoria?: string;
    followupMaxTentativas?: number;
  } = {};

  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.nomeAssistente === "string") data.nomeAssistente = body.nomeAssistente;
  if ("saudacao" in body) data.saudacao = body.saudacao ? String(body.saudacao) : null;
  if (typeof body.tom === "string") data.tom = body.tom;
  if (typeof body.handoffMinCategoria === "string") data.handoffMinCategoria = body.handoffMinCategoria;
  if (typeof body.followupMaxTentativas === "number") data.followupMaxTentativas = body.followupMaxTentativas;

  const config = await prisma.sdrConfig.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: { ...data, updatedAt: new Date() },
  });

  return NextResponse.json({ config });
}
