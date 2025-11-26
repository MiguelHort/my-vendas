// app/api/dashboard/leads/route.ts
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
    return NextResponse.json(
      { error: "Usuário inválido" },
      { status: 401 }
    );
  }

  try {
    const user = await getOrCreateUserByFirebaseUid({
      firebaseUid,
      email,
      name: name || undefined,
    });

    const leads = await prisma.lead.findMany({
      where: { userId: user.id },
      orderBy: { dataEntrada: "desc" },
    });

    const payload = leads.map((l) => ({
      id: l.id,
      origem: l.origem,
      status: l.status,
      valor_comissao: l.valorComissao,
      data_entrada: l.dataEntrada.toISOString(),
      estado: l.estado ?? "",
    }));

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao carregar leads" },
      { status: 500 }
    );
  }
}
