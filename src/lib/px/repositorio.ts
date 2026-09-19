import type { Prisma, PrismaClient } from "@prisma/client";
import type { ProdutoNormalizado } from "./normalizar";
import type { TabelaCotavel } from "./cotacao";

/** O que o job de sincronização precisa do banco (permite trocar por um repositório em memória nos testes). */
export interface RepositorioSync {
  hashAtual(produtoId: number): Promise<string | null>;
  salvarProduto(normalizado: ProdutoNormalizado): Promise<{ tabelas: number; precos: number }>;
  registrarSync(log: {
    iniciadoEm: Date;
    status: "ok" | "com_erros";
    detalhes: unknown;
  }): Promise<void>;
}

// Postgres aceita ~32 mil parâmetros por comando; o produto Amil SC tem 4.260 preços x 10 colunas.
const TAMANHO_LOTE = 2000;

function emLotes<T>(itens: T[], tamanho = TAMANHO_LOTE): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

/**
 * Substitui tudo de um produto (tabelas, planos e preços). Precisa rodar dentro de UMA
 * transação: se qualquer passo falhar, nada muda no banco.
 */
export async function salvarProdutoEmTransacao(
  tx: Prisma.TransactionClient,
  normalizado: ProdutoNormalizado
): Promise<{ tabelas: number; precos: number }> {
  const { produto, planos, tabelas, hash } = normalizado;

  const dadosProduto = {
    nome: produto.nome ?? `Produto ${produto.px_id}`,
    operadora: produto.operadora,
    operadoraPxId: produto.operadora_px_id,
    categoriaPxId: produto.categoria_px_id,
    visivel: produto.visivel,
    hashConteudo: hash,
    sincronizadoEm: new Date(),
  };
  await tx.pxProduto.upsert({
    where: { pxId: produto.px_id },
    create: { pxId: produto.px_id, ...dadosProduto },
    update: dadosProduto,
  });

  // Apaga a versão anterior (os preços saem junto, por ON DELETE CASCADE).
  await tx.pxTabela.deleteMany({ where: { produtoPxId: produto.px_id } });
  await tx.pxPlano.deleteMany({ where: { produtoPxId: produto.px_id } });

  await tx.pxPlano.createMany({
    data: planos.map((p) => ({
      produtoPxId: produto.px_id,
      pxPlanoId: p.px_plano_id,
      nome: p.nome,
      codigoAns: p.codigo_ans,
      acomodacao: p.acomodacao,
      abrangencia: p.abrangencia,
    })),
  });

  await tx.pxTabela.createMany({
    data: tabelas.map((t) => ({
      pxVinculoId: t.px_vinculo_id,
      pxTabelaId: t.px_tabela_id,
      produtoPxId: t.produto_px_id,
      modalidade: t.modalidade,
      linha: t.linha,
      coparticipacao: t.coparticipacao,
      coparticipacaoDetalhe: t.coparticipacao_detalhe,
      contratacao: t.contratacao,
      mei: t.mei,
      obstetricia: t.obstetricia,
      idadeUnica: t.idade_unica,
      vidasMin: t.vidas_min,
      vidasMax: t.vidas_max,
      idadeMin: t.idade_min,
      idadeMax: t.idade_max,
      descontoPercentual: t.desconto_percentual,
      administradora: t.administradora,
      entidades: t.entidades as unknown as Prisma.InputJsonValue,
      vigenciaInicio: t.vigencia_inicio ? new Date(t.vigencia_inicio) : null,
      vigenciaFim: t.vigencia_fim ? new Date(t.vigencia_fim) : null,
      visivel: t.visivel,
      ordem: t.ordem,
      inconsistencias: t.inconsistencias as unknown as Prisma.InputJsonValue,
    })),
  });

  const precos = tabelas.flatMap((t) =>
    t.planos.flatMap((p) =>
      p.precos.map((f) => ({
        pxVinculoId: t.px_vinculo_id,
        pxPlanoId: p.px_plano_id,
        planoNome: p.nome,
        acomodacao: p.acomodacao,
        planoVisivel: p.visivel,
        planoOrdem: p.ordem,
        faixaId: f.faixa_id,
        idadeMin: f.idade_min,
        idadeMax: f.idade_max,
        valor: f.valor,
      }))
    )
  );
  for (const lote of emLotes(precos)) {
    await tx.pxPreco.createMany({ data: lote });
  }

  return { tabelas: tabelas.length, precos: precos.length };
}

/** Repositório real, em cima do Prisma. */
export function criarRepositorioPrisma(db: PrismaClient): RepositorioSync {
  return {
    async hashAtual(produtoId) {
      const p = await db.pxProduto.findUnique({
        where: { pxId: produtoId },
        select: { hashConteudo: true },
      });
      return p?.hashConteudo ?? null;
    },

    salvarProduto(normalizado) {
      // O padrão do Prisma é 5s de transação; gravar ~4 mil preços leva mais que isso.
      return db.$transaction((tx) => salvarProdutoEmTransacao(tx, normalizado), {
        timeout: 60_000,
        maxWait: 10_000,
      });
    },

    async registrarSync({ iniciadoEm, status, detalhes }) {
      await db.pxSyncLog.create({
        data: {
          iniciadoEm,
          finalizadoEm: new Date(),
          status,
          detalhes: detalhes as Prisma.InputJsonValue,
        },
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Leitura pra cotação
// ---------------------------------------------------------------------------

/**
 * Carrega as tabelas visíveis no formato que o calculador espera. O filtro no banco é só uma
 * pré-seleção (modalidade e vidas mínimas); as regras finas ficam em `calcularCotacao`.
 */
export async function carregarTabelas(
  db: PrismaClient,
  { modalidade, vidas }: { modalidade?: string; vidas?: number } = {}
): Promise<TabelaCotavel[]> {
  const tabelas = await db.pxTabela.findMany({
    where: {
      visivel: true,
      produto: { visivel: true },
      ...(modalidade ? { modalidade } : {}),
      ...(vidas !== undefined ? { vidasMin: { lte: vidas } } : {}),
    },
    include: {
      produto: { select: { nome: true, operadora: true } },
      precos: { orderBy: [{ planoOrdem: "asc" }, { pxPlanoId: "asc" }, { faixaId: "asc" }] },
    },
    orderBy: [{ produtoPxId: "asc" }, { ordem: "asc" }, { pxVinculoId: "asc" }],
  });

  return tabelas.map((t) => {
    const planosPorId = new Map<number, TabelaCotavel["planos"][number]>();
    for (const p of t.precos) {
      let plano = planosPorId.get(p.pxPlanoId);
      if (!plano) {
        plano = {
          px_plano_id: p.pxPlanoId,
          nome: p.planoNome,
          acomodacao: p.acomodacao,
          visivel: p.planoVisivel,
          precos: [],
        };
        planosPorId.set(p.pxPlanoId, plano);
      }
      plano.precos.push({
        faixa_id: p.faixaId,
        idade_min: p.idadeMin,
        idade_max: p.idadeMax,
        valor: Number(p.valor),
      });
    }

    return {
      px_vinculo_id: t.pxVinculoId,
      px_tabela_id: t.pxTabelaId,
      produto_nome: t.produto.nome,
      operadora: t.produto.operadora,
      modalidade: t.modalidade,
      linha: t.linha,
      coparticipacao: t.coparticipacao,
      coparticipacao_detalhe: t.coparticipacaoDetalhe,
      contratacao: t.contratacao,
      mei: t.mei,
      obstetricia: t.obstetricia,
      idade_unica: t.idadeUnica,
      vidas_min: t.vidasMin,
      vidas_max: t.vidasMax,
      idade_min: t.idadeMin,
      idade_max: t.idadeMax,
      desconto_percentual: Number(t.descontoPercentual),
      entidades: t.entidades as unknown as TabelaCotavel["entidades"],
      vigencia_inicio: t.vigenciaInicio ? t.vigenciaInicio.toISOString() : null,
      vigencia_fim: t.vigenciaFim ? t.vigenciaFim.toISOString() : null,
      visivel: t.visivel,
      planos: [...planosPorId.values()],
    };
  });
}
