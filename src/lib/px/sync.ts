import { SessaoExpirada, buscarProduto } from "./client";
import { normalizarProduto } from "./normalizar";
import type { RepositorioSync } from "./repositorio";

/**
 * Sincronização das tabelas de preço da PX (disparada à mão, pelo botão ou pelo comando).
 * Sem alertas: o resultado de cada execução fica em `px_sync_log` e aparece na tela.
 */

export type ResultadoProduto = {
  produto: number | null;
  nome?: string;
  status: "atualizado" | "sem mudanças" | "erro";
  tabelas?: number;
  precos?: number;
  inconsistencias?: string[];
  erro?: string;
};

export type ResultadoSync = {
  iniciadoEm: Date;
  status: "ok" | "com_erros";
  relatorio: ResultadoProduto[];
};

export type DependenciasSync = {
  repo: RepositorioSync;
  /** Baixa o produto na PX (padrão: cliente real). Injetável pra teste. */
  buscar?: (id: number) => Promise<unknown>;
  /** Pausa entre produtos (padrão: setTimeout). Injetável pra teste. */
  esperar?: (ms: number) => Promise<void>;
  intervaloMs?: number;
};

export class SincronizacaoEmAndamento extends Error {
  constructor() {
    super("Já existe uma sincronização em andamento.");
    this.name = "SincronizacaoEmAndamento";
  }
}

const dormir = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

/** Lê PX_PRODUTOS ("12,15,20"). */
export function idsDosProdutos(valor = process.env.PX_PRODUTOS): number[] {
  const ids = (valor ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) {
    throw new Error("PX_PRODUTOS não configurado (ex.: PX_PRODUTOS=12,15,20)");
  }
  return [...new Set(ids)];
}

// Mensagem de erro segura pra gravar em log/banco.
const mensagemDe = (erro: unknown) =>
  (erro instanceof Error ? erro.message : String(erro)).slice(0, 500);

export async function sincronizarProduto(
  produtoId: number,
  { repo, buscar = buscarProduto }: DependenciasSync
): Promise<ResultadoProduto> {
  const bruto = await buscar(produtoId);
  const normalizado = normalizarProduto(bruto); // lança FormatoInesperado se o formato mudou

  if ((await repo.hashAtual(produtoId)) === normalizado.hash) {
    return { produto: produtoId, nome: normalizado.produto.nome, status: "sem mudanças" };
  }

  const gravado = await repo.salvarProduto(normalizado);
  const inconsistencias = normalizado.tabelas.flatMap((t) =>
    t.inconsistencias.map((i) => `tabela ${t.px_tabela_id}: ${i}`)
  );
  return {
    produto: produtoId,
    nome: normalizado.produto.nome,
    status: "atualizado",
    ...gravado,
    inconsistencias,
  };
}

let emAndamento = false;

/**
 * Roda a sincronização de todos os produtos. Um produto com erro (formato quebrado, falha de rede)
 * não impede os outros, e nunca altera o que já estava salvo dele. Sessão expirada interrompe o
 * job inteiro (os próximos falhariam também). Uma execução por vez neste processo.
 */
export async function sincronizar(
  ids: number[],
  deps: DependenciasSync
): Promise<ResultadoSync> {
  if (emAndamento) throw new SincronizacaoEmAndamento();
  emAndamento = true;

  const iniciadoEm = new Date();
  const esperar = deps.esperar ?? dormir;
  const intervalo = deps.intervaloMs ?? (Number(process.env.PX_INTERVALO_MS) || 2000);
  const relatorio: ResultadoProduto[] = [];

  try {
    for (const [i, id] of ids.entries()) {
      try {
        relatorio.push(await sincronizarProduto(id, deps));
      } catch (erro) {
        relatorio.push({ produto: id, status: "erro", erro: mensagemDe(erro) });
        if (erro instanceof SessaoExpirada) break;
      }
      if (i < ids.length - 1) await esperar(intervalo);
    }

    const status = relatorio.some((r) => r.status === "erro") ? "com_erros" : "ok";

    try {
      await deps.repo.registrarSync({ iniciadoEm, status, detalhes: relatorio });
    } catch (erro) {
      console.error("[px-sync] não foi possível gravar o log da sincronização:", mensagemDe(erro));
    }

    return { iniciadoEm, status, relatorio };
  } finally {
    emAndamento = false;
  }
}
