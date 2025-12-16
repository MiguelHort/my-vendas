import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcTotalForAges, type AgeBandPrice, type AgeQty } from "@/lib/quote/calc";
import { Prisma } from "@prisma/client";

type Body = {
  segment: "PF" | "PME";
  areaId: string;
  lives: number;
  ages: AgeQty[];

  includeOdonto?: boolean; // ignorado por enquanto
  accommodation?: "ENFERMARIA" | "APARTAMENTO" | "ANY";
  adhesionType?: "LIVRE_ADESAO" | "COMPULSORIO" | "ANY";
  operatorId?: string | "ANY";
};

function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return badRequest("JSON inválido");
  }

  if (!body.areaId) return badRequest("areaId é obrigatório");
  if (!body.segment || (body.segment !== "PF" && body.segment !== "PME")) return badRequest("segment inválido");
  if (!Number.isFinite(body.lives) || body.lives <= 0) return badRequest("lives inválido");
  if (!Array.isArray(body.ages) || body.ages.length === 0) return badRequest("ages inválido");

  const where: Prisma.RateCardWhereInput = {
    areaId: body.areaId,
    segment: body.segment, // Prisma aceita string do enum
    validTo: null,
    active: true,
    minLives: { lte: body.lives },
    maxLives: { gte: body.lives },
  };

  if (body.operatorId && body.operatorId !== "ANY") {
    where.operatorId = body.operatorId;
  }

  if (body.accommodation && body.accommodation !== "ANY") {
    where.accommodation = body.accommodation; // "ENFERMARIA" | "APARTAMENTO"
  }

  if (body.segment === "PME" && body.adhesionType && body.adhesionType !== "ANY") {
    where.adhesionType = body.adhesionType; // "LIVRE_ADESAO" | "COMPULSORIO"
  }

  const rateCards = await prisma.rateCard.findMany({
    where,
    include: {
      operator: { select: { id: true, name: true, colorHex: true } },
      product: { select: { id: true, commercialName: true } },
      planVariant: { select: { id: true, planName: true, coverageJson: true } },
      area: { select: { id: true, name: true } },
    },
    take: 200,
  });

  const options: Array<{
    rateCardId: string;
    operator: { id: string; name: string; colorHex?: string | null };
    product: { id: string; commercialName: string };
    planVariant: { id: string; planName: string; coverageJson: any };
    area: { id: string; name: string };
    segment: string;
    accommodation: string;
    adhesionType: string | null;
    minLives: number;
    maxLives: number;
    total: number;
    breakdown: { age: number; qty: number; unit: number; subtotal: number }[];
  }> = [];

  for (const rc of rateCards) {
    const bands = rc.pricesByAge as unknown as AgeBandPrice[];

    const calc = calcTotalForAges(bands, body.ages);
    if (!calc.ok) continue;

    options.push({
      rateCardId: rc.id,
      operator: rc.operator,
      product: rc.product,
      planVariant: rc.planVariant,
      area: rc.area,
      segment: rc.segment,
      accommodation: rc.accommodation,
      adhesionType: rc.adhesionType,
      minLives: rc.minLives,
      maxLives: rc.maxLives,
      total: calc.total,
      breakdown: calc.breakdown,
    });
  }

  options.sort((a, b) => a.total - b.total);

  return NextResponse.json({ options: options.slice(0, 30) });
}
