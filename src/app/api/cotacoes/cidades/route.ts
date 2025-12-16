import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.city.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
    },
    take: 15,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      uf: true,
      area: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ items });
}
