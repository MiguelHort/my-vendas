import type { PlanoDaTabelaNormalizado, TabelaNormalizada } from "./normalizar";

/**
 * Calcula a cotação localmente, a partir das tabelas salvas no banco. Não chama a PX.
 * Dinheiro sempre em centavos inteiros durante o cálculo (nunca somar float).
 */

export const MODALIDADES = ["PME", "Adesão"] as const;
export type Modalidade = (typeof MODALIDADES)[number];

export type EntradaCotacao = {
  /** Uma idade por beneficiário (obrigatório). A quantidade de vidas é o número de idades. */
  idades: number[];
  /** A empresa é MEI? (só vale em PME) */
  mei?: boolean;
  modalidade?: Modalidade;
  /** "Compulsório" | "Opcional/Livre Adesão" */
  contratacao?: string;
  /** "Parcial" | "Completa" */
  coparticipacao?: string;
  /** "Enfermaria" | "Apartamento" */
  acomodacao?: string;
  /** "Amil" | "Selecionada" | "Black" */
  linha?: string;
  obstetricia?: boolean;
  /** Sigla da entidade de classe (Adesão) */
  entidade?: string;
  /** Produto/região da PX (ex.: 12 = Amil SC). Sem isso, cota em todos os produtos. */
  produto_px_id?: number;
  /** Data de referência da vigência (padrão: hoje). ISO. */
  data?: string;
};

export type OpcoesCotacao = {
  /**
   * Algumas tabelas da PX vêm com faixa de vidas impossível (ex.: 30 a 29).
   * "excluir" (padrão) deixa essas tabelas de fora; "tratar_como_sem_maximo" exige só vidas >= mínimo.
   */
  tabelasComVidasInvalidas?: "excluir" | "tratar_como_sem_maximo";
};

export type PlanoCotavel = Pick<
  PlanoDaTabelaNormalizado,
  "px_plano_id" | "nome" | "acomodacao" | "visivel" | "precos"
>;

export type TabelaCotavel = Pick<
  TabelaNormalizada,
  | "px_vinculo_id"
  | "px_tabela_id"
  | "produto_px_id"
  | "modalidade"
  | "linha"
  | "coparticipacao"
  | "coparticipacao_detalhe"
  | "contratacao"
  | "mei"
  | "obstetricia"
  | "idade_unica"
  | "vidas_min"
  | "vidas_max"
  | "idade_min"
  | "idade_max"
  | "desconto_percentual"
  | "entidades"
  | "vigencia_inicio"
  | "vigencia_fim"
  | "visivel"
> & {
  produto_nome?: string | null;
  operadora?: string | null;
  planos: PlanoCotavel[];
};

export type DetalheBeneficiario = { idade: number; faixa: string; valor: number };

export type ResultadoCotacao = {
  produto: string | null;
  operadora: string | null;
  linha: string | null;
  plano: string;
  acomodacao: string | null;
  coparticipacao: string | null;
  contratacao: string | null;
  modalidade: string | null;
  mei: boolean;
  obstetricia: boolean;
  vidas: number;
  subtotal: number;
  desconto: number;
  total: number;
  detalhamento: DetalheBeneficiario[];
  referencia: { px_vinculo_id: number; px_tabela_id: number; px_plano_id: number };
};

export type TabelaExcluida = { px_vinculo_id: number; linha: string | null; motivo: string };

export type SaidaCotacao = {
  vidas: number;
  resultados: ResultadoCotacao[];
  excluidas: TabelaExcluida[];
};

export class EntradaInvalida extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "EntradaInvalida";
  }
}

const INDIFERENTE = "Indiferente";

const emCentavos = (valor: number) => Math.round(Number(valor) * 100);
const emReais = (centavos: number) => centavos / 100;

function rotuloCoparticipacao(t: Pick<TabelaCotavel, "coparticipacao" | "coparticipacao_detalhe">) {
  return [t.coparticipacao, t.coparticipacao_detalhe].filter(Boolean).join(" ") || null;
}

/** Valida as idades: ao menos uma, todas inteiras entre 0 e 120. */
export function validarIdades(idades: unknown): number[] {
  if (!Array.isArray(idades) || idades.length === 0) {
    throw new EntradaInvalida("Informe ao menos uma idade");
  }
  const numeros = idades.map((i) =>
    typeof i === "number" || (typeof i === "string" && i.trim() !== "") ? Number(i) : NaN
  );
  if (numeros.some((i) => !Number.isInteger(i) || i < 0 || i > 120)) {
    throw new EntradaInvalida("Todas as idades precisam ser números inteiros entre 0 e 120");
  }
  return numeros;
}

/** Devolve o motivo pelo qual a tabela não serve pra esta cotação, ou null se ela serve. */
export function motivoDeExclusao(
  t: TabelaCotavel,
  entrada: EntradaCotacao,
  idades: number[],
  data: Date,
  opcoes: OpcoesCotacao
): string | null {
  const vidas = idades.length;

  if (entrada.produto_px_id !== undefined && t.produto_px_id !== entrada.produto_px_id) {
    return "outro produto/região";
  }
  if (!t.visivel) return "tabela oculta na PX";
  if (t.vigencia_inicio && new Date(t.vigencia_inicio) > data) return "tabela ainda não vigente";
  if (t.vigencia_fim && new Date(t.vigencia_fim) < data) return "tabela vencida";
  if (t.idade_unica) return "tabela de idade única (regra ainda não implementada)";
  if (entrada.modalidade && t.modalidade !== entrada.modalidade) return `modalidade ${t.modalidade}`;

  if (t.vidas_max < t.vidas_min) {
    if (opcoes.tabelasComVidasInvalidas !== "tratar_como_sem_maximo") {
      return `faixa de vidas inválida na PX (${t.vidas_min} a ${t.vidas_max})`;
    }
    if (vidas < t.vidas_min) return `aceita a partir de ${t.vidas_min} vidas`;
  } else if (vidas < t.vidas_min || vidas > t.vidas_max) {
    return `aceita de ${t.vidas_min} a ${t.vidas_max} vidas`;
  }

  if (idades.some((i) => i < t.idade_min || i > t.idade_max)) {
    return `aceita idades de ${t.idade_min} a ${t.idade_max}`;
  }

  // Na PX, tabelas MEI e não-MEI têm preços diferentes: cada empresa usa a sua (só em PME).
  if (t.modalidade === "PME" && t.mei !== Boolean(entrada.mei)) {
    return t.mei ? "tabela exclusiva para MEI" : "tabela não aceita MEI";
  }

  if (
    entrada.contratacao &&
    t.contratacao &&
    t.contratacao !== INDIFERENTE &&
    t.contratacao !== entrada.contratacao
  ) {
    return `contratação ${t.contratacao}`;
  }
  if (entrada.coparticipacao && t.coparticipacao !== entrada.coparticipacao) {
    return `coparticipação ${t.coparticipacao}`;
  }
  if (entrada.linha && t.linha !== entrada.linha) return `linha ${t.linha}`;
  if (entrada.obstetricia !== undefined && t.obstetricia !== Boolean(entrada.obstetricia)) {
    return t.obstetricia ? "com obstetrícia" : "sem obstetrícia";
  }
  if (
    entrada.entidade &&
    t.entidades?.length &&
    !t.entidades.some((e) => e.sigla === entrada.entidade)
  ) {
    return "entidade de classe diferente";
  }
  return null;
}

function calcularPlano(plano: PlanoCotavel, idades: number[]): DetalheBeneficiario[] | null {
  const detalhamento: DetalheBeneficiario[] = [];
  for (const idade of idades) {
    const faixa = plano.precos.find((p) => idade >= p.idade_min && idade <= p.idade_max);
    if (!faixa) return null;
    detalhamento.push({
      idade,
      faixa: faixa.idade_max >= 100 ? `${faixa.idade_min}+` : `${faixa.idade_min} a ${faixa.idade_max}`,
      valor: Number(faixa.valor),
    });
  }
  return detalhamento;
}

export function calcularCotacao(
  tabelas: TabelaCotavel[],
  entrada: EntradaCotacao,
  opcoes: OpcoesCotacao = {}
): SaidaCotacao {
  const idades = validarIdades(entrada?.idades);
  const data = entrada.data ? new Date(entrada.data) : new Date();
  const resultados: ResultadoCotacao[] = [];
  const excluidas: TabelaExcluida[] = [];

  for (const t of tabelas) {
    const motivo = motivoDeExclusao(t, entrada, idades, data, opcoes);
    if (motivo) {
      excluidas.push({ px_vinculo_id: t.px_vinculo_id, linha: t.linha, motivo });
      continue;
    }

    for (const plano of t.planos) {
      if (!plano.visivel) continue;
      if (entrada.acomodacao && plano.acomodacao !== entrada.acomodacao) continue;

      const detalhamento = calcularPlano(plano, idades);
      if (!detalhamento) {
        excluidas.push({
          px_vinculo_id: t.px_vinculo_id,
          linha: t.linha,
          motivo: `${plano.nome}: idade sem faixa de preço`,
        });
        continue;
      }

      const subtotal = detalhamento.reduce((soma, d) => soma + emCentavos(d.valor), 0);
      const desconto = Math.round((subtotal * (Number(t.desconto_percentual) || 0)) / 100);

      resultados.push({
        produto: t.produto_nome ?? null,
        operadora: t.operadora ?? null,
        linha: t.linha,
        plano: plano.nome,
        acomodacao: plano.acomodacao,
        coparticipacao: rotuloCoparticipacao(t),
        contratacao: t.contratacao,
        modalidade: t.modalidade,
        mei: t.mei,
        obstetricia: t.obstetricia,
        vidas: idades.length,
        subtotal: emReais(subtotal),
        desconto: emReais(desconto),
        total: emReais(subtotal - desconto),
        detalhamento,
        referencia: {
          px_vinculo_id: t.px_vinculo_id,
          px_tabela_id: t.px_tabela_id,
          px_plano_id: plano.px_plano_id,
        },
      });
    }
  }

  resultados.sort((a, b) => a.total - b.total);
  return { vidas: idades.length, resultados, excluidas };
}

// ---------------------------------------------------------------------------
// Entrada vinda da API (não confiável): valida e devolve só os campos conhecidos.
// ---------------------------------------------------------------------------

const texto = (v: unknown, max = 60): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

export function parseEntrada(bruto: unknown): EntradaCotacao {
  if (!bruto || typeof bruto !== "object") throw new EntradaInvalida("Dados da cotação inválidos");
  const b = bruto as Record<string, unknown>;

  const entrada: EntradaCotacao = { idades: validarIdades(b.idades) };

  if (b.modalidade !== undefined && b.modalidade !== null && b.modalidade !== "") {
    if (!MODALIDADES.includes(b.modalidade as Modalidade)) {
      throw new EntradaInvalida("Modalidade deve ser PME ou Adesão");
    }
    entrada.modalidade = b.modalidade as Modalidade;
  }
  if (typeof b.mei === "boolean") entrada.mei = b.mei;
  if (typeof b.obstetricia === "boolean") entrada.obstetricia = b.obstetricia;

  const contratacao = texto(b.contratacao);
  const coparticipacao = texto(b.coparticipacao);
  const acomodacao = texto(b.acomodacao);
  const linha = texto(b.linha);
  const entidade = texto(b.entidade);
  if (b.produto_px_id !== undefined && b.produto_px_id !== null && b.produto_px_id !== "") {
    const id = Number(b.produto_px_id);
    if (!Number.isInteger(id) || id <= 0) throw new EntradaInvalida("Produto/região inválido");
    entrada.produto_px_id = id;
  }
  if (contratacao) entrada.contratacao = contratacao;
  if (coparticipacao) entrada.coparticipacao = coparticipacao;
  if (acomodacao) entrada.acomodacao = acomodacao;
  if (linha) entrada.linha = linha;
  if (entidade) entrada.entidade = entidade;

  if (b.data !== undefined && b.data !== null && b.data !== "") {
    const d = new Date(String(b.data));
    if (Number.isNaN(d.getTime())) throw new EntradaInvalida("Data inválida");
    entrada.data = d.toISOString();
  }
  return entrada;
}
