/**
 * Financeiro da empresa — regras compartilhadas entre as rotas de API e a página.
 * Valores em reais (number); a divisão entre sócios é feita em centavos pra não
 * perder nem inventar centavo.
 */

export const SOCIOS = [
  { id: "miguel", nome: "Miguel", percentual: 40 },
  { id: "victor", nome: "Victor", percentual: 60 },
] as const;

export const ENTRY_TIPOS = ["ENTRADA", "DESPESA_EVENTUAL"] as const;
export type EntryTipo = (typeof ENTRY_TIPOS)[number];

export type FinanceEntryDto = {
  id: string;
  tipo: EntryTipo;
  descricao: string;
  valor: number;
  data: string; // YYYY-MM-DD
  lead_id: string | null;
};

export type FixedCostDto = {
  id: string;
  descricao: string;
  valor: number;
  dia_vencimento: number;
  inicio: string; // YYYY-MM
  fim: string | null; // YYYY-MM
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(v: unknown): v is string {
  return typeof v === "string" && MONTH_RE.test(v);
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Primeiro e último dia (YYYY-MM-DD) do mês. */
export function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

export function fixedCostActiveInMonth(
  cost: Pick<FixedCostDto, "inicio" | "fim">,
  month: string
): boolean {
  return cost.inicio <= month && (cost.fim === null || cost.fim >= month);
}

const toCents = (v: number) => Math.round(v * 100);

/** Divide `total` entre os sócios; o último absorve a sobra de arredondamento pra somar exato. */
export function splitBySocios(total: number) {
  const totalCents = toCents(total);
  let allocated = 0;
  return SOCIOS.map((s, i) => {
    const cents =
      i === SOCIOS.length - 1
        ? totalCents - allocated
        : Math.round((totalCents * s.percentual) / 100);
    allocated += cents;
    return { ...s, valor: cents / 100 };
  });
}

export type FinanceSummary = {
  entradas: number;
  despesasFixas: number;
  despesasEventuais: number;
  despesas: number;
  resultado: number;
  socios: ReturnType<typeof splitBySocios>;
};

export function summarize(
  entries: Pick<FinanceEntryDto, "tipo" | "valor">[],
  fixedCosts: Pick<FixedCostDto, "valor">[]
): FinanceSummary {
  const sum = (xs: { valor: number }[]) =>
    xs.reduce((acc, x) => acc + toCents(x.valor), 0) / 100;

  const entradas = sum(entries.filter((e) => e.tipo === "ENTRADA"));
  const despesasEventuais = sum(entries.filter((e) => e.tipo === "DESPESA_EVENTUAL"));
  const despesasFixas = sum(fixedCosts);
  const despesas = (toCents(despesasEventuais) + toCents(despesasFixas)) / 100;
  const resultado = (toCents(entradas) - toCents(despesas)) / 100;

  return {
    entradas,
    despesasFixas,
    despesasEventuais,
    despesas,
    resultado,
    socios: splitBySocios(resultado),
  };
}

/** Aceita número ou string ("1.234,56" / "1234.56"); devolve null se inválido ou <= 0. */
export function parseMoney(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
