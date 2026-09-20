import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { extrairProdutoDaResposta, normalizarProduto } from "../normalizar";
import { EntradaInvalida } from "../cotacao";
import {
  LeadNaoEncontrado,
  cotacaoParaDto,
  cotar,
  estaDefasada,
  opcoesDaConfiguracao,
  parseSelecionadas,
  salvarCotacao,
  statusSincronizacao,
} from "../servico";

const bruto = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/amil-sc.json"), "utf8")
) as unknown;
const normalizado = normalizarProduto(extrairProdutoDaResposta(bruto));

// Linhas no formato que o Prisma devolve (px_tabelas + produto + preços).
const linhas = normalizado.tabelas.map((t) => ({
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
  descontoPercentual: t.desconto_percentual, // o Prisma devolve Decimal; o código faz Number()
  entidades: t.entidades,
  vigenciaInicio: null as Date | null,
  vigenciaFim: null as Date | null,
  visivel: t.visivel,
  ordem: t.ordem,
  inconsistencias: t.inconsistencias,
  produto: { nome: normalizado.produto.nome, operadora: normalizado.produto.operadora },
  precos: t.planos.flatMap((p) =>
    p.precos.map((f) => ({
      pxPlanoId: p.px_plano_id,
      planoNome: p.nome,
      acomodacao: p.acomodacao,
      planoVisivel: p.visivel,
      planoOrdem: p.ordem,
      faixaId: f.faixa_id,
      idadeMin: f.idade_min,
      idadeMax: f.idade_max,
      valor: f.valor, // Decimal no banco; Number() no código
    }))
  ),
}));

type Where = { modalidade?: string; vidasMin?: { lte: number }; produtoPxId?: number };

function dbFalso(extra: Record<string, unknown> = {}) {
  const criadas: unknown[] = [];
  const db = {
    pxTabela: {
      findMany: vi.fn(async ({ where }: { where?: Where } = {}) =>
        linhas.filter(
          (l) =>
            (!where?.modalidade || l.modalidade === where.modalidade) &&
            (!where?.vidasMin || l.vidasMin <= where.vidasMin.lte) &&
            (where?.produtoPxId === undefined || l.produtoPxId === where.produtoPxId)
        )
      ),
    },
    pxSyncLog: {
      findFirst: vi.fn(async () => null),
    },
    pxProduto: { findMany: vi.fn(async () => []) },
    lead: { findUnique: vi.fn(async () => ({ id: "lead-1" })) },
    cotacao: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        criadas.push(data);
        return { id: "cot-1", criadoEm: new Date("2026-09-19T12:00:00Z"), leadId: data.leadId, ...data };
      }),
    },
    ...extra,
  };
  return { db: db as unknown as PrismaClient, mocks: db, criadas };
}

describe("cotar (tabelas vindas do banco)", () => {
  it("dá os mesmos números da referência (casos #1, #2 e #7)", async () => {
    const { db } = dbFalso();

    const c1 = await cotar(db, { idades: [34, 31, 4], mei: false, modalidade: "PME" });
    expect(c1.resultados).toHaveLength(61);
    expect(c1.resultados[0].total).toBe(1070.01);
    expect(c1.resultados[0].referencia.px_tabela_id).toBe(5256);
    expect(c1.resultados[0].produto).toBe("Amil SC");
    expect(c1.resultados[0].operadora).toBe("Amil");

    const c2 = await cotar(db, { idades: [45, 42, 17, 15], mei: true, modalidade: "PME" });
    expect(c2.resultados).toHaveLength(39);
    expect(c2.resultados[0].total).toBe(1828.59);

    const c7 = await cotar(db, { idades: [40], modalidade: "Adesão" });
    expect(c7.resultados).toHaveLength(4);
    expect(c7.resultados[0].total).toBe(779.89);
  });

  it("pré-filtra no banco por modalidade e vidas mínimas", async () => {
    const { db, mocks } = dbFalso();
    await cotar(db, { idades: [30, 31, 32], modalidade: "PME" });
    expect(mocks.pxTabela.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ modalidade: "PME", vidasMin: { lte: 3 }, visivel: true }),
      })
    );
  });

  it("filtra por produto/região no banco", async () => {
    const { db, mocks } = dbFalso();
    const daRegiao = await cotar(db, { idades: [34, 31, 4], mei: false, modalidade: "PME", produto_px_id: 12 });
    expect(daRegiao.resultados).toHaveLength(61);
    expect(mocks.pxTabela.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ produtoPxId: 12 }) })
    );

    const deOutra = await cotar(db, { idades: [34, 31, 4], mei: false, modalidade: "PME", produto_px_id: 99 });
    expect(deOutra.resultados).toHaveLength(0);
  });

  it("respeita a configuração de faixa de vidas inválida (caso #3 e #4)", async () => {
    const entrada = {
      idades: Array.from({ length: 35 }, (_, i) => 20 + i),
      mei: false,
      modalidade: "PME" as const,
      contratacao: "Opcional/Livre Adesão",
    };
    const { db } = dbFalso();

    vi.stubEnv("PX_TABELAS_VIDAS_INVALIDAS", "");
    expect((await cotar(db, entrada)).resultados).toHaveLength(13);

    vi.stubEnv("PX_TABELAS_VIDAS_INVALIDAS", "tratar_como_sem_maximo");
    expect((await cotar(db, entrada)).resultados).toHaveLength(55);
    vi.unstubAllEnvs();
  });
});

describe("opcoesDaConfiguracao", () => {
  it("padrão é excluir; só o valor exato muda o comportamento", () => {
    expect(opcoesDaConfiguracao(undefined).tabelasComVidasInvalidas).toBe("excluir");
    expect(opcoesDaConfiguracao("qualquer coisa").tabelasComVidasInvalidas).toBe("excluir");
    expect(opcoesDaConfiguracao("tratar_como_sem_maximo").tabelasComVidasInvalidas).toBe(
      "tratar_como_sem_maximo"
    );
  });
});

describe("salvarCotacao", () => {
  const entrada = { idades: [34, 31, 4], mei: false, modalidade: "PME" as const };

  it("recalcula no servidor e guarda uma cópia dos preços das opções escolhidas", async () => {
    const { db, criadas } = dbFalso();
    const calculo = await cotar(db, entrada);
    const escolhida = calculo.resultados[0];

    await salvarCotacao(db, {
      leadId: "lead-1",
      criadoPorId: "user-1",
      entrada,
      selecionadas: [
        { px_vinculo_id: escolhida.referencia.px_vinculo_id, px_plano_id: escolhida.referencia.px_plano_id },
      ],
    });

    expect(criadas).toHaveLength(1);
    const salvo = criadas[0] as { leadId: string; criadoPorId: string; resultado: { opcoes: typeof calculo.resultados; vidas: number } };
    expect(salvo.leadId).toBe("lead-1");
    expect(salvo.criadoPorId).toBe("user-1");
    expect(salvo.resultado.vidas).toBe(3);
    expect(salvo.resultado.opcoes).toHaveLength(1);
    // a cópia traz total e o detalhamento por beneficiário — não depende mais da tabela
    expect(salvo.resultado.opcoes[0].total).toBe(1070.01);
    expect(salvo.resultado.opcoes[0].detalhamento.map((d) => d.valor)).toEqual([426.57, 406.26, 237.18]);
  });

  it("ignora opções que não pertencem ao cálculo (cliente não escolhe preço)", async () => {
    const { db, criadas } = dbFalso();
    await expect(
      salvarCotacao(db, {
        leadId: null,
        criadoPorId: "user-1",
        entrada,
        selecionadas: [{ px_vinculo_id: 999999, px_plano_id: 1 }],
      })
    ).rejects.toBeInstanceOf(EntradaInvalida);
    expect(criadas).toHaveLength(0);
  });

  it("aceita cotação sem lead", async () => {
    const { db, mocks } = dbFalso();
    const c = (await cotar(db, entrada)).resultados[0].referencia;
    await salvarCotacao(db, {
      leadId: null,
      criadoPorId: "user-1",
      entrada,
      selecionadas: [{ px_vinculo_id: c.px_vinculo_id, px_plano_id: c.px_plano_id }],
    });
    expect(mocks.lead.findUnique).not.toHaveBeenCalled();
  });

  it("lead inexistente vira LeadNaoEncontrado e nada é salvo", async () => {
    const { db, criadas } = dbFalso({ lead: { findUnique: vi.fn(async () => null) } });
    await expect(
      salvarCotacao(db, {
        leadId: "nao-existe",
        criadoPorId: "user-1",
        entrada,
        selecionadas: [{ px_vinculo_id: 1, px_plano_id: 1 }],
      })
    ).rejects.toBeInstanceOf(LeadNaoEncontrado);
    expect(criadas).toHaveLength(0);
  });
});

describe("parseSelecionadas", () => {
  it("valida lista, ids inteiros e tamanho", () => {
    expect(parseSelecionadas([{ px_vinculo_id: 1, px_plano_id: 2 }])).toEqual([
      { px_vinculo_id: 1, px_plano_id: 2 },
    ]);
    expect(() => parseSelecionadas([])).toThrow(EntradaInvalida);
    expect(() => parseSelecionadas(null)).toThrow(EntradaInvalida);
    expect(() => parseSelecionadas([{ px_vinculo_id: "1", px_plano_id: 2 }])).toThrow(EntradaInvalida);
    expect(() => parseSelecionadas([null])).toThrow(EntradaInvalida);
    expect(() =>
      parseSelecionadas(Array.from({ length: 101 }, () => ({ px_vinculo_id: 1, px_plano_id: 1 })))
    ).toThrow(EntradaInvalida);
  });
});

describe("status da sincronização", () => {
  const agora = new Date("2026-09-19T12:00:00Z");
  const dia = 24 * 60 * 60 * 1000;

  it("fica defasada sem sucesso ou com mais de 3 dias", () => {
    expect(estaDefasada(null, agora)).toBe(true);
    expect(estaDefasada(new Date(agora.getTime() - 2 * dia), agora)).toBe(false);
    expect(estaDefasada(new Date(agora.getTime() - 3 * dia), agora)).toBe(false);
    expect(estaDefasada(new Date(agora.getTime() - 3 * dia - 1000), agora)).toBe(true);
  });

  it("monta o status com produtos e contagem de tabelas inconsistentes", async () => {
    const ok = { iniciadoEm: new Date(agora.getTime() - dia), finalizadoEm: new Date(agora.getTime() - dia), status: "ok", detalhes: [] };
    const { db } = dbFalso({
      pxSyncLog: { findFirst: vi.fn(async ({ where }: { where?: { status?: string } } = {}) => (where?.status === "ok" ? ok : ok)) },
      pxProduto: {
        findMany: vi.fn(async () => [
          { pxId: 12, nome: "Amil SC", operadora: "Amil", sincronizadoEm: new Date(agora.getTime() - dia) },
        ]),
      },
    });

    const s = await statusSincronizacao(db, agora);
    expect(s.defasada).toBe(false);
    expect(s.ultima?.status).toBe("ok");
    expect(s.produtos).toHaveLength(1);
    expect(s.produtos[0]).toMatchObject({ px_id: 12, tabelas: 60, tabelas_com_inconsistencia: 6 });
  });

  it("sem nenhum log: sem última e defasada", async () => {
    const { db } = dbFalso();
    const s = await statusSincronizacao(db, agora);
    expect(s.ultima).toBeNull();
    expect(s.ultima_ok_em).toBeNull();
    expect(s.defasada).toBe(true);
  });
});

describe("cotacaoParaDto", () => {
  it("usa o nome do usuário (ou e-mail) e datas ISO", () => {
    const dto = cotacaoParaDto({
      id: "1",
      leadId: null,
      criadoEm: new Date("2026-09-19T12:00:00Z"),
      entrada: {},
      resultado: {},
      criadoPor: { id: "u", name: null, email: "a@b.com" },
    });
    expect(dto.criado_por).toBe("a@b.com");
    expect(dto.criado_em).toBe("2026-09-19T12:00:00.000Z");
    expect(dto.lead_nome).toBeNull();
  });
});
