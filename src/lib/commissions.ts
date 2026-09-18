/**
 * Comissão por operadora + modalidade — substituiu o modelo antigo (por
 * usuário, interno/externo) em 2026-09-18. Um único percentual global por
 * combinação operadora×modalidade, editável em `/dashboard/configuracoes`.
 */

export const MODALIDADES = ["PF", "PME", "Adesão", "Empresarial"] as const;
export type Modalidade = (typeof MODALIDADES)[number];

/** operadora -> modalidade -> percentual (0-100+, ex: 250 = 250%). */
export type CommissionMap = Record<string, Record<string, number>>;

/** Percentual padrão quando não há linha configurada pra essa combinação. */
export const DEFAULT_COMMISSION_PCT = 100;

/**
 * Percentual de comissão pra uma operadora+modalidade. Sem operadora, sem
 * modalidade, ou sem linha configurada pra essa combinação → cai no padrão.
 */
export function getCommissionPct(
  commissionMap: CommissionMap,
  operadora: string | null | undefined,
  modalidade: string | null | undefined
): number {
  if (!operadora || !modalidade) return DEFAULT_COMMISSION_PCT;
  const byModalidade = commissionMap[operadora];
  if (!byModalidade || byModalidade[modalidade] == null) return DEFAULT_COMMISSION_PCT;
  return byModalidade[modalidade];
}

/** Monta o `CommissionMap` a partir das linhas cruas que a API devolve. */
export function buildCommissionMap(
  rows: { operadora: string; modalidade: string; percentual: number }[]
): CommissionMap {
  const map: CommissionMap = {};
  for (const r of rows) {
    if (!map[r.operadora]) map[r.operadora] = {};
    map[r.operadora][r.modalidade] = r.percentual;
  }
  return map;
}
