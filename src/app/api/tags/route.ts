import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  return NextResponse.json({
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const name = (body?.name as string | undefined)?.trim();
  const color = (body?.color as string | undefined)?.trim() || "#6366f1";

  if (!name) {
    return NextResponse.json({ error: "Nome da etiqueta é obrigatório" }, { status: 400 });
  }
  if (!HEX_COLOR.test(color)) {
    return NextResponse.json({ error: "Cor inválida" }, { status: 400 });
  }

  const tag = await prisma.tag.create({ data: { name, color } });

  return NextResponse.json({ tag: { id: tag.id, name: tag.name, color: tag.color } });
}
