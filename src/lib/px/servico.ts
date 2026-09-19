import type { Prisma, PrismaClient } from "@prisma/client";
import {
  EntradaInvalida,
  calcularCotacao,
  type EntradaCotacao,
  type OpcoesCotacao,
  type ResultadoCotacao,
  type SaidaCotacao,
} from "./cotacao";
import { carregarTabelas } from "./repositorio";

/** Sincronização com mais que isso sem sucesso vira alerta na tela. */
export const DIAS_PARA_DEFASADA = 3;

/**
 * Configuração `tabelasComVidasInvalidas` (env PX_TABELAS_VIDAS_INVALIDAS): "excluir" (padrão)
 * ou "tratar_como_sem_maximo". Só o servidor decide — o cliente não escolhe.
 */
export function opcoesDaConfiguracao(env = process.env.PX_TABELAS_VIDAS_INVALIDAS): OpcoesCotacao {
  return {
    tabelasComVidasInvalidas: env === "tratar_como_sem_maximo" ? "tratar_como_sem_maximo" : "excluir",
  };
}

/** Calcula uma cotação com as tabelas salvas no banco. Nunca chama a PX. */
export async function cotar(db: PrismaClient, entrada: EntradaCotacao): Promise<SaidaCotacao> {
  const tabelas = await carregarTabelas(db, {
    modalidade: entrada.modalidade,
    vidas: entrada.idades.length,
  });
  return calcularCotacao(tabelas, entrada, opcoesDaConfiguracao());
}

// ---------------------------------------------------------------------------
// Status da sincronização
// ---------------------------------------------------------------------------

export type StatusSincronizacao = {
  ultima: {
    iniciado_em: string;
    finalizado_em: string;
    status: string;
    detalhes: unknown;
  } | null;
  /** Fim da última execução SEM erros (é a que vale pra saber se as tabelas estão em dia). */
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

export function estaDefasada(ultimaOkEm: Date | null, agora = new Date()): boolean {
  if (!ultimaOkEm) return true;
  return agora.getTime() - ultimaOkEm.getTime() > DIAS_PARA_DEFASADA * 24 * 60 * 60 * 1000;
}

export async function statusSincronizacao(
  db: PrismaClient,
  agora = new Date()
): Promise<StatusSincronizacao> {
  const [ultima, ultimaOk, produtos, tabelas] = await Promise.all([
    db.pxSyncLog.findFirst({ orderBy: { finalizadoEm: "desc" } }),
    db.pxSyncLog.findFirst({ where: { status: "ok" }, orderBy: { finalizadoEm: "desc" } }),
    db.pxProduto.findMany({ orderBy: { pxId: "asc" } }),
    db.pxTabela.findMany({ select: { produtoPxId: true, inconsistencias: true } }),
  ]);

  return {
    ultima: ultima
      ? {
          iniciado_em: ultima.iniciadoEm.toISOString(),
          finalizado_em: ultima.finalizadoEm.toISOString(),
          status: ultima.status,
          detalhes: ultima.detalhes,
        }
      : null,
    ultima_ok_em: ultimaOk ? ultimaOk.finalizadoEm.toISOString() : null,
    defasada: estaDefasada(ultimaOk?.finalizadoEm ?? null, agora),
    produtos: produtos.map((p) => {
      const suas = tabelas.filter((t) => t.produtoPxId === p.pxId);
      return {
        px_id: p.pxId,
        nome: p.nome,
        operadora: p.operadora,
        sincronizado_em: p.sincronizadoEm.toISOString(),
        tabelas: suas.length,
        tabelas_com_inconsistencia: suas.filter(
          (t) => Array.isArray(t.inconsistencias) && t.inconsistencias.length > 0
        ).length,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Cotações salvas
// ---------------------------------------------------------------------------

export type OpcaoSelecionada = { px_vinculo_id: number; px_plano_id: number };

export class LeadNaoEncontrado extends Error {
  constructor() {
    super("Lead não encontrado");
    this.name = "LeadNaoEncontrado";
  }
}

/** Valida `selecionadas` vindas do cliente (lista não vazia de pares de ids inteiros). */
export function parseSelecionadas(bruto: unknown): OpcaoSelecionada[] {
  if (!Array.isArray(bruto) || bruto.length === 0) {
    throw new EntradaInvalida("Escolha ao menos uma opção pra salvar");
  }
  if (bruto.length > 100) throw new EntradaInvalida("Opções demais (máximo 100)");
  return bruto.map((s) => {
    const v = s as Partial<OpcaoSelecionada> | null;
    if (!v || !Number.isInteger(v.px_vinculo_id) || !Number.isInteger(v.px_plano_id)) {
      throw new EntradaInvalida("Opção selecionada inválida");
    }
    return { px_vinculo_id: v.px_vinculo_id as number, px_plano_id: v.px_plano_id as number };
  });
}

/**
 * Salva a cotação com as opções que o corretor escolheu. Os valores NÃO vêm do cliente: a
 * cotação é recalculada aqui e o resultado guarda uma CÓPIA dos preços usados, pra não mudar
 * quando a tabela for reajustada.
 */
export async function salvarCotacao(
  db: PrismaClient,
  params: {
    leadId: string | null;
    criadoPorId: string;
    entrada: EntradaCotacao;
    selecionadas: OpcaoSelecionada[];
  }
) {
  const { leadId, criadoPorId, entrada, selecionadas } = params;

  if (leadId) {
    const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!lead) throw new LeadNaoEncontrado();
  }

  const calculo = await cotar(db, entrada);
  const chaves = new Set(selecionadas.map((s) => `${s.px_vinculo_id}:${s.px_plano_id}`));
  const escolhidas: ResultadoCotacao[] = calculo.resultados.filter((r) =>
    chaves.has(`${r.referencia.px_vinculo_id}:${r.referencia.px_plano_id}`)
  );
  if (escolhidas.length === 0) {
    throw new EntradaInvalida("Nenhuma das opções escolhidas é válida para esta cotação");
  }

  const status = await statusSincronizacao(db);
  const resultado = {
    versao: 1,
    gerado_em: new Date().toISOString(),
    tabelas_atualizadas_em: status.ultima_ok_em,
    tabelas_com_vidas_invalidas: opcoesDaConfiguracao().tabelasComVidasInvalidas,
    vidas: calculo.vidas,
    opcoes: escolhidas,
  };

  return db.cotacao.create({
    data: {
      leadId,
      criadoPorId,
      entrada: entrada as unknown as Prisma.InputJsonValue,
      resultado: resultado as unknown as Prisma.InputJsonValue,
    },
    include: { criadoPor: { select: { id: true, name: true, email: true } } },
  });
}

export async function listarCotacoes(
  db: PrismaClient,
  { leadId, limite = 50 }: { leadId?: string; limite?: number } = {}
) {
  return db.cotacao.findMany({
    where: leadId ? { leadId } : {},
    orderBy: { criadoEm: "desc" },
    take: Math.min(Math.max(limite, 1), 200),
    include: {
      criadoPor: { select: { id: true, name: true, email: true } },
      lead: { select: { id: true, nome: true } },
    },
  });
}

/** Formato enviado ao navegador. */
export function cotacaoParaDto(c: {
  id: string;
  leadId: string | null;
  criadoEm: Date;
  entrada: unknown;
  resultado: unknown;
  criadoPor?: { id: string; name: string | null; email: string } | null;
  lead?: { id: string; nome: string } | null;
}) {
  return {
    id: c.id,
    lead_id: c.leadId,
    lead_nome: c.lead?.nome ?? null,
    criado_em: c.criadoEm.toISOString(),
    criado_por: c.criadoPor ? (c.criadoPor.name ?? c.criadoPor.email) : null,
    entrada: c.entrada,
    resultado: c.resultado,
  };
}
