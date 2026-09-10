import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Substitui o conjunto de etiquetas de um lead pelo enviado em `{ tagIds }`.
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: leadId } = await context.params;
  const body = await req.json().catch(() => null);
  const requestedIds: string[] = Array.isArray(body?.tagIds)
    ? body.tagIds.filter((x: unknown) => typeof x === "string")
    : [];

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  // só ids de etiquetas que realmente existem (evita erro de FK com estado velho no cliente)
  const validTags = requestedIds.length
    ? await prisma.tag.findMany({ where: { id: { in: requestedIds } }, select: { id: true } })
    : [];
  const validIds = validTags.map((t) => t.id);

  await prisma.$transaction([
    prisma.leadTag.deleteMany({ where: { leadId } }),
    ...(validIds.length
      ? [
          prisma.leadTag.createMany({
            data: validIds.map((tagId) => ({ leadId, tagId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  const rows = await prisma.leadTag.findMany({
    where: { leadId },
    include: { tag: true },
    orderBy: { tag: { name: "asc" } },
  });

  return NextResponse.json({
    tags: rows.map((r) => ({ id: r.tag.id, name: r.tag.name, color: r.tag.color })),
  });
}
