import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { error: "Não autenticado", status: 401 as const };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const decoded = await firebaseAdmin.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return { error: "Usuário não encontrado", status: 404 as const };
    }

    if (user.role !== "ADMIN") {
      return { error: "Não autorizado", status: 403 as const };
    }

    return { adminUser: user };
  } catch (err) {
    console.error("Erro em ensureAdmin:", err);
    return { error: "Token inválido", status: 401 as const };
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { id } = await context.params;
  const body = await req.json();

  const { email, name, role, approved } = body;

  if (role !== undefined && role !== "ADMIN" && role !== "VENDEDOR") {
    return NextResponse.json({ error: "Cargo inválido" }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Atualiza no Firebase (email / displayName)
    const updateFirebasePayload: { email?: string; displayName?: string } = {};

    if (email && email !== existing.email) {
      updateFirebasePayload.email = email;
    }
    if (name && name !== existing.name) {
      updateFirebasePayload.displayName = name;
    }

    if (Object.keys(updateFirebasePayload).length > 0) {
      await firebaseAdmin.updateUser(existing.firebaseUid, updateFirebasePayload);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email: typeof email === "string" ? email : existing.email,
        name: typeof name === "string" ? name : existing.name,
        role: role ?? existing.role,
        approved: typeof approved === "boolean" ? approved : existing.approved,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Deleta no Firebase
    await firebaseAdmin.deleteUser(existing.firebaseUid);

    // Deleta no Supabase (Postgres) via Prisma
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao deletar usuário:", err);
    return NextResponse.json(
      { error: "Erro ao deletar usuário" },
      { status: 500 }
    );
  }
}
