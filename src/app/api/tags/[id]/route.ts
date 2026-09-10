import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);

  const data: { name?: string; color?: string } = {};

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Nome da etiqueta é obrigatório" }, { status: 400 });
    }
    data.name = name;
  }

  if (body?.color !== undefined) {
    const color = String(body.color).trim();
    if (!HEX_COLOR.test(color)) {
      return NextResponse.json({ error: "Cor inválida" }, { status: 400 });
    }
    data.color = color;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  try {
    const tag = await prisma.tag.update({ where: { id }, data });
    return NextResponse.json({ tag: { id: tag.id, name: tag.name, color: tag.color } });
  } catch {
    return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 });
  }
}
