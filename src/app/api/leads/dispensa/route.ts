// app/api/leads/dispensa/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserByFirebaseUid } from "@/lib/user-from-firebase";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const firebaseUid = searchParams.get("firebaseUid");
  const email = searchParams.get("email");
  const name = searchParams.get("name");

  if (!firebaseUid || !email) {
    return NextResponse.json(
      { error: "Usuário inválido" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.id || !body.motivo_dispensa) {
    return NextResponse.json(
      { error: "Dados inválidos" },
      { status: 400 }
    );
  }

  try {
    await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    const lead = await prisma.lead.update({
      where: { id: body.id },
      data: {
        status: "Dispensado",
        motivoDispensa: body.motivo_dispensa,
      },
    });

    return NextResponse.json({ success: true, id: lead.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao dispensar lead" },
      { status: 500 }
    );
  }
}
