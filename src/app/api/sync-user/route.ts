// app/api/sync-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { firebaseUid, email, name } = await req.json();

    if (!firebaseUid || !email) {
      return NextResponse.json(
        { message: "firebaseUid e email são obrigatórios." },
        { status: 400 }
      );
    }

    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: {
        email,
        name,
      },
      create: {
        firebaseUid,
        email,
        name,
      },
    });

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Erro em /api/sync-user:", err);
    return NextResponse.json(
      { message: "Erro ao sincronizar usuário." },
      { status: 500 }
    );
  }
}