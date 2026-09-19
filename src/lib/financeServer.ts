import type { Prisma } from "@prisma/client";
import type { FinanceEntryDto, FixedCostDto } from "@/lib/finance";

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function entryToDto(e: {
  id: string;
  tipo: string;
  descricao: string;
  valor: Prisma.Decimal;
  data: Date;
  leadId: string | null;
}): FinanceEntryDto {
  return {
    id: e.id,
    tipo: e.tipo as FinanceEntryDto["tipo"],
    descricao: e.descricao,
    valor: Number(e.valor),
    data: isoDay(e.data),
    lead_id: e.leadId,
  };
}

export function fixedToDto(c: {
  id: string;
  descricao: string;
  valor: Prisma.Decimal;
  diaVencimento: number;
  inicio: string;
  fim: string | null;
}): FixedCostDto {
  return {
    id: c.id,
    descricao: c.descricao,
    valor: Number(c.valor),
    dia_vencimento: c.diaVencimento,
    inicio: c.inicio,
    fim: c.fim,
  };
}
