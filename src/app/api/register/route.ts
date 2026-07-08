// app/api/register/route.ts
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

    const existing = await prisma.user.findUnique({ where: { firebaseUid } });
    if (existing) {
      return NextResponse.json(
        { id: existing.id, email: existing.email, name: existing.name },
        { status: 200 }
      );
    }

    const user = await prisma.user.create({
      data: {
        firebaseUid,
        email,
        name,
        role: "VENDEDOR",
        approved: false,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (err) {
    console.error("Erro em /api/register:", err);
    return NextResponse.json(
      { message: "Erro ao criar cadastro." },
      { status: 500 }
    );
  }
}
