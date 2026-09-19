import crypto from "node:crypto";

/**
 * Converte o produto que a PX devolve (com plans e tableBinds) no formato usado
 * pelo sistema. Os nomes dos campos da PX estão comentados ao lado de cada campo.
 * ATENÇÃO: a ordem dos campos dos objetos normalizados entra no hash de conteúdo
 * (JSON.stringify) — mudar a ordem muda o hash e força um "produto alterado".
 */

export class FormatoInesperado extends Error {
  constructor(mensagem: string) {
    super(`Formato inesperado na resposta da PX: ${mensagem}`);
    this.name = "FormatoInesperado";
  }
}

// ---------------------------------------------------------------------------
// Tipos do que vem da PX (só o que a gente lê; tudo o mais é ignorado)
// ---------------------------------------------------------------------------

type PxNomeado = { id?: number; name?: string } | null | undefined;

type PxAgePrice = { age?: { id: number; minAge: number; maxAge: number }; price?: number };

type PxPlanoDaTabela = {
  planId: number;
  name: string;
  order?: number;
  isVisible?: boolean;
  accommodation?: PxNomeado;
  agePrices?: PxAgePrice[];
};

type PxValueTable = {
  id: number;
  isVisible?: boolean;
  isMei?: boolean;
  isObstetrics?: boolean;
  isSingleAge?: boolean;
  copayType?: PxNomeado;
  copayDescription?: string;
  compulsoryType?: PxNomeado;
  lifeAmountMin: number;
  lifeAmountMax: number;
  ageLimitMin?: number | null;
  ageLimitMax?: number | null;
  extraInformation?: string;
  modality?: PxNomeado;
  classOrganization?: PxNomeado;
  classEntities?: { acronym: string; name: string; professions?: { name: string }[] }[];
  expirationFrom?: string | null;
  expirationTo?: string | null;
  order?: number;
};

type PxTableBind = {
  id: number;
  order?: number;
  isVisible?: boolean;
  percentualDiscount?: number;
  expirationFrom?: string | null;
  expirationTo?: string | null;
  valueTable?: PxValueTable;
  plans?: PxPlanoDaTabela[];
};

export type PxProdutoBruto = {
  id: number;
  name?: string;
  categoryId?: number;
  isVisible?: boolean;
  organization?: { id?: number; name?: string } | null;
  plans?: {
    id: number;
    name: string;
    ansCode?: string;
    accommodation?: PxNomeado;
    coverageArea?: PxNomeado;
  }[];
  tableBinds: PxTableBind[];
};

// ---------------------------------------------------------------------------
// Formato normalizado
// ---------------------------------------------------------------------------

export type PrecoNormalizado = {
  faixa_id: number;
  idade_min: number;
  idade_max: number;
  valor: number;
};

export type PlanoDaTabelaNormalizado = {
  px_plano_id: number;
  nome: string;
  acomodacao: string | null;
  visivel: boolean;
  ordem: number;
  precos: PrecoNormalizado[];
};

export type EntidadeNormalizada = { sigla: string; nome: string; profissoes: string[] };

export type TabelaNormalizada = {
  px_vinculo_id: number;
  px_tabela_id: number;
  produto_px_id: number;
  modalidade: string | null;
  linha: string | null;
  coparticipacao: string | null;
  coparticipacao_detalhe: string | null;
  contratacao: string | null;
  mei: boolean;
  obstetricia: boolean;
  idade_unica: boolean;
  vidas_min: number;
  vidas_max: number;
  idade_min: number;
  idade_max: number;
  desconto_percentual: number;
  administradora: string | null;
  entidades: EntidadeNormalizada[];
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  visivel: boolean;
  ordem: number;
  inconsistencias: string[];
  planos: PlanoDaTabelaNormalizado[];
};

export type PlanoNormalizado = {
  px_plano_id: number;
  nome: string;
  codigo_ans: string | null;
  acomodacao: string | null;
  abrangencia: string | null;
};

export type ProdutoNormalizado = {
  produto: {
    px_id: number;
    nome: string | undefined;
    operadora: string | null;
    operadora_px_id: number | null;
    categoria_px_id: number | null;
    visivel: boolean;
  };
  planos: PlanoNormalizado[];
  tabelas: TabelaNormalizada[];
  hash: string;
};

// ---------------------------------------------------------------------------

/** Confere o formato antes de gravar qualquer coisa: se a PX mudar a API, o job para aqui em vez de estragar as tabelas salvas. */
export function validarEstrutura(produto: unknown): asserts produto is PxProdutoBruto {
  if (!produto || typeof produto !== "object") throw new FormatoInesperado("produto vazio");
  const p = produto as Partial<PxProdutoBruto>;
  if (typeof p.id !== "number") throw new FormatoInesperado("produto sem id");
  if (!Array.isArray(p.tableBinds)) throw new FormatoInesperado("campo tableBinds ausente");
  if (p.tableBinds.length === 0) throw new FormatoInesperado("produto sem nenhuma tabela");

  for (const vinculo of p.tableBinds) {
    const t = vinculo.valueTable;
    if (!t || typeof t.id !== "number") {
      throw new FormatoInesperado(`vínculo ${vinculo.id} sem valueTable`);
    }
    if (typeof t.lifeAmountMin !== "number" || typeof t.lifeAmountMax !== "number") {
      throw new FormatoInesperado(`tabela ${t.id} sem faixa de vidas`);
    }
    if (!Array.isArray(vinculo.plans)) throw new FormatoInesperado(`vínculo ${vinculo.id} sem plans`);
    for (const plano of vinculo.plans) {
      if (!Array.isArray(plano.agePrices) || plano.agePrices.length === 0) {
        throw new FormatoInesperado(`plano ${plano.planId} da tabela ${t.id} sem agePrices`);
      }
      for (const ap of plano.agePrices) {
        if (
          typeof ap.price !== "number" ||
          typeof ap.age?.minAge !== "number" ||
          typeof ap.age?.maxAge !== "number"
        ) {
          throw new FormatoInesperado(`preço inválido no plano ${plano.planId} da tabela ${t.id}`);
        }
      }
    }
  }
}

const nome = (objeto: PxNomeado): string | null =>
  objeto && typeof objeto === "object" ? (objeto.name ?? null) : null;

// A vigência efetiva é a interseção da vigência da tabela com a do vínculo.
function maisTarde(a?: string | null, b?: string | null): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}
function maisCedo(a?: string | null, b?: string | null): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a) < new Date(b) ? a : b;
}

function normalizarPlanoDaTabela(
  plano: PxPlanoDaTabela,
  inconsistencias: string[]
): PlanoDaTabelaNormalizado {
  const precos: PrecoNormalizado[] = (plano.agePrices ?? [])
    .map((ap) => ({
      faixa_id: ap.age!.id, // agePrices[].age.id (1 a 10)
      idade_min: ap.age!.minAge, // agePrices[].age.minAge
      idade_max: ap.age!.maxAge, // agePrices[].age.maxAge
      valor: ap.price as number, // agePrices[].price
    }))
    .sort((a, b) => a.idade_min - b.idade_min);

  const rotulo = `${plano.name} ${nome(plano.accommodation) ?? ""}`.trim();
  if (precos.some((p) => p.valor <= 0)) inconsistencias.push(`${rotulo}: preço zerado em alguma faixa`);
  for (let i = 1; i < precos.length; i++) {
    if (precos[i].idade_min !== precos[i - 1].idade_max + 1) {
      inconsistencias.push(`${rotulo}: faixas etárias com buraco ou sobreposição`);
      break;
    }
  }

  return {
    px_plano_id: plano.planId, // plans[].planId
    nome: plano.name, // plans[].name
    acomodacao: nome(plano.accommodation), // plans[].accommodation.name
    visivel: plano.isVisible !== false,
    ordem: plano.order ?? 0,
    precos,
  };
}

function normalizarTabela(vinculo: PxTableBind, produtoId: number): TabelaNormalizada {
  const t = vinculo.valueTable as PxValueTable;
  const inconsistencias: string[] = [];
  if (t.lifeAmountMax < t.lifeAmountMin) {
    inconsistencias.push(`faixa de vidas inválida na PX (${t.lifeAmountMin} a ${t.lifeAmountMax})`);
  }
  const planos = (vinculo.plans ?? []).map((p) => normalizarPlanoDaTabela(p, inconsistencias));

  return {
    px_vinculo_id: vinculo.id, // tableBinds[].id
    px_tabela_id: t.id, // valueTable.id
    produto_px_id: produtoId,
    modalidade: nome(t.modality), // valueTable.modality.name (PME, Adesão)
    linha: t.extraInformation || null, // valueTable.extraInformation (Amil, Selecionada, Black)
    coparticipacao: nome(t.copayType), // valueTable.copayType.name (Parcial, Completa)
    coparticipacao_detalhe: t.copayDescription || null, // valueTable.copayDescription (ex.: 40%)
    contratacao: nome(t.compulsoryType), // valueTable.compulsoryType.name
    mei: Boolean(t.isMei), // valueTable.isMei
    obstetricia: Boolean(t.isObstetrics), // valueTable.isObstetrics
    idade_unica: Boolean(t.isSingleAge), // valueTable.isSingleAge
    vidas_min: t.lifeAmountMin, // valueTable.lifeAmountMin
    vidas_max: t.lifeAmountMax, // valueTable.lifeAmountMax
    idade_min: t.ageLimitMin ?? 0, // valueTable.ageLimitMin
    idade_max: t.ageLimitMax ?? 999, // valueTable.ageLimitMax
    desconto_percentual: Number(vinculo.percentualDiscount) || 0, // tableBinds[].percentualDiscount
    administradora: nome(t.classOrganization), // valueTable.classOrganization.name
    entidades: (t.classEntities || []).map((e) => ({
      // valueTable.classEntities (Adesão)
      sigla: e.acronym,
      nome: e.name,
      profissoes: (e.professions || []).map((p) => p.name),
    })),
    vigencia_inicio: maisTarde(t.expirationFrom, vinculo.expirationFrom),
    vigencia_fim: maisCedo(t.expirationTo, vinculo.expirationTo),
    visivel: vinculo.isVisible !== false && t.isVisible !== false,
    ordem: vinculo.order ?? t.order ?? 0,
    inconsistencias,
    planos,
  };
}

function calcularHash(tabelas: TabelaNormalizada[], planos: PlanoNormalizado[]): string {
  const ordenado = {
    tabelas: [...tabelas]
      .sort((a, b) => a.px_vinculo_id - b.px_vinculo_id)
      .map((t) => ({ ...t, planos: [...t.planos].sort((a, b) => a.px_plano_id - b.px_plano_id) })),
    planos: [...planos].sort((a, b) => a.px_plano_id - b.px_plano_id),
  };
  return crypto.createHash("sha256").update(JSON.stringify(ordenado)).digest("hex");
}

/** Valida e converte o produto bruto da PX. Lança `FormatoInesperado` se a estrutura não for a esperada. */
export function normalizarProduto(produto: unknown): ProdutoNormalizado {
  validarEstrutura(produto);

  const tabelas = produto.tableBinds.map((v) => normalizarTabela(v, produto.id));
  const planos: PlanoNormalizado[] = (produto.plans || []).map((p) => ({
    px_plano_id: p.id,
    nome: p.name,
    codigo_ans: p.ansCode || null,
    acomodacao: nome(p.accommodation),
    abrangencia: nome(p.coverageArea)?.trim() || null,
  }));

  return {
    produto: {
      px_id: produto.id,
      nome: produto.name,
      operadora: nome(produto.organization),
      operadora_px_id: produto.organization?.id ?? null,
      categoria_px_id: produto.categoryId ?? null,
      visivel: produto.isVisible !== false,
    },
    planos,
    tabelas,
    hash: calcularHash(tabelas, planos),
  };
}

/**
 * Acha o produto dentro de uma resposta em lote do tRPC (como a copiada do DevTools),
 * procurando o item que tem `tableBinds`.
 */
export function extrairProdutoDaResposta(json: unknown): unknown {
  const itens = Array.isArray(json) ? json : [json];
  for (const item of itens as Record<string, unknown>[]) {
    const result = item?.result as { data?: { json?: unknown } | unknown } | undefined;
    const data = result?.data as { json?: unknown } | undefined;
    const dados = (data && typeof data === "object" && "json" in data ? data.json : result?.data ?? item) as
      | { tableBinds?: unknown }
      | undefined;
    if (dados && Array.isArray(dados.tableBinds)) return dados;
  }
  throw new FormatoInesperado("nenhum item com tableBinds na resposta");
}
