import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const firebaseUid = searchParams.get("firebaseUid");
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  try {
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    const config = await prisma.userAlertConfig.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json(
      config ?? { whatsappNumber: null, alertNovoLead: false },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao carregar configurações" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const firebaseUid = searchParams.get("firebaseUid");
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  if (!firebaseUid || !email) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { whatsappNumber, alertNovoLead } = body as {
    whatsappNumber?: string | null;
    alertNovoLead?: boolean;
  };

  const normalizedNumber = whatsappNumber
    ? whatsappNumber.replace(/\D/g, "") || null
    : null;

  try {
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const config = await prisma.userAlertConfig.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        whatsappNumber: normalizedNumber,
        alertNovoLead: !!alertNovoLead,
      },
      update: {
        whatsappNumber: normalizedNumber,
        alertNovoLead: !!alertNovoLead,
      },
    });

    return NextResponse.json(config);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 500 });
  }
}
