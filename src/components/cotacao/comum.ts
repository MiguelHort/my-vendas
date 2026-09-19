import type { EntradaCotacao, ResultadoCotacao, TabelaExcluida } from "@/lib/px/cotacao";

export type AuthHeader = () => Promise<Record<string, string> | null>;

export type LeadResumo = { id: string; nome: string; telefone: string | null };

export type SincronizacaoResumo = { ultima_ok_em: string | null; defasada: boolean };

export type CalculoDto = {
  vidas: number;
  resultados: ResultadoCotacao[];
  excluidas: TabelaExcluida[];
  sincronizacao: SincronizacaoResumo;
};

export type CotacaoSalvaDto = {
  id: string;
  lead_id: string | null;
  lead_nome: string | null;
  criado_em: string;
  criado_por: string | null;
  entrada: EntradaCotacao;
  resultado: {
    gerado_em: string;
    tabelas_atualizadas_em: string | null;
    vidas: number;
    opcoes: ResultadoCotacao[];
  };
};

export type StatusSyncDto = {
  ultima: {
    iniciado_em: string;
    finalizado_em: string;
    status: string;
    detalhes: {
      produto: number | null;
      nome?: string;
      status: string;
      tabelas?: number;
      precos?: number;
      inconsistencias?: string[];
      erro?: string;
    }[];
  } | null;
  ultima_ok_em: string | null;
  defasada: boolean;
  produtos: {
    px_id: number;
    nome: string;
    operadora: string | null;
    sincronizado_em: string;
    tabelas: number;
    tabelas_com_inconsistencia: number;
  }[];
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const chaveOpcao = (r: ResultadoCotacao) =>
  `${r.referencia.px_vinculo_id}:${r.referencia.px_plano_id}`;

/** Extrai idades de um texto livre ("34, 31 e 4", "34 31 4"). Devolve as válidas e as rejeitadas. */
export function extrairIdades(texto: string): { validas: number[]; invalidas: string[] } {
  const partes = texto.split(/[^\d-]+/).filter(Boolean);
  const validas: number[] = [];
  const invalidas: string[] = [];
  for (const p of partes) {
    const n = Number(p);
    if (Number.isInteger(n) && n >= 0 && n <= 120) validas.push(n);
    else invalidas.push(p);
  }
  return { validas, invalidas };
}

/** Resumo legível das opções escolhidas na entrada (histórico). */
export function resumoEntrada(e: EntradaCotacao): string {
  const partes: string[] = [];
  if (e.modalidade) partes.push(e.modalidade);
  if (e.modalidade === "PME" || (!e.modalidade && e.mei !== undefined)) {
    partes.push(e.mei ? "MEI" : "não MEI");
  }
  if (e.contratacao) partes.push(e.contratacao);
  if (e.coparticipacao) partes.push(e.coparticipacao);
  if (e.acomodacao) partes.push(e.acomodacao);
  if (e.linha) partes.push(`linha ${e.linha}`);
  if (e.entidade) partes.push(`entidade ${e.entidade}`);
  return partes.join(" · ");
}
