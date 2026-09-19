import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  SincronizacaoEmAndamento,
  idsDosProdutos,
  sincronizar,
  type DependenciasSync,
} from "../sync";
import type { ProdutoNormalizado } from "../normalizar";
import type { RepositorioSync } from "../repositorio";

const fixtureTexto = fs.readFileSync(path.join(__dirname, "fixtures/amil-sc.json"), "utf8");
const HASH_AMIL_SC = "bb35ee5086f40638562bf4263481d31ac2a82bb6e28e6d76cc45136c66ee87a2";

/** Repositório em memória: guarda o que foi "gravado" por produto, como o banco faria. */
function repoEmMemoria() {
  const produtos = new Map<number, { hash: string; tabelas: number; precos: number }>();
  const logs: { status: string; detalhes: unknown }[] = [];
  let gravacoes = 0;

  const repo: RepositorioSync = {
    async hashAtual(id) {
      return produtos.get(id)?.hash ?? null;
    },
    async salvarProduto(n: ProdutoNormalizado) {
      gravacoes++;
      const precos = n.tabelas.reduce(
        (s, t) => s + t.planos.reduce((s2, p) => s2 + p.precos.length, 0),
        0
      );
      produtos.set(n.produto.px_id, { hash: n.hash, tabelas: n.tabelas.length, precos });
      return { tabelas: n.tabelas.length, precos };
    },
    async registrarSync({ status, detalhes }) {
      logs.push({ status, detalhes });
    },
  };
  return { repo, produtos, logs, gravacoes: () => gravacoes };
}

/** Simula a PX no nível do HTTP (o cliente real roda de verdade). */
function px(resposta: (produtoId: number) => Response) {
  const chamadas: number[] = [];
  const fetchFalso = vi.fn(async (url: string | URL) => {
    const entrada = JSON.parse(new URL(String(url)).searchParams.get("input")!)["0"];
    chamadas.push(entrada.id);
    return resposta(entrada.id);
  });
  vi.stubGlobal("fetch", fetchFalso);
  return { chamadas, fetchFalso };
}

const okComFixture = () => new Response(fixtureTexto, { status: 200 });
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });

const semEspera: Pick<DependenciasSync, "esperar" | "intervaloMs"> = {
  esperar: async () => {},
  intervaloMs: 0,
};

beforeEach(() => {
  vi.stubEnv("PX_COOKIE", "sessao=SEGREDO");
  vi.stubEnv("PX_PROC_PRODUTO", "produtoCompleto");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sincronizar (PX simulada)", () => {
  it("1ª execução grava 60 tabelas e 4.260 preços; 2ª retorna 'sem mudanças'", async () => {
    const { repo, produtos, logs, gravacoes } = repoEmMemoria();
    px(okComFixture);

    const primeira = await sincronizar([12], { repo, ...semEspera });
    expect(primeira.status).toBe("ok");
    expect(primeira.relatorio[0]).toMatchObject({
      produto: 12,
      status: "atualizado",
      tabelas: 60,
      precos: 4260,
    });
    expect(primeira.relatorio[0].inconsistencias!.length).toBeGreaterThan(0);
    expect(produtos.get(12)).toEqual({ hash: HASH_AMIL_SC, tabelas: 60, precos: 4260 });

    const segunda = await sincronizar([12], { repo, ...semEspera });
    expect(segunda.status).toBe("ok");
    expect(segunda.relatorio[0]).toMatchObject({ produto: 12, status: "sem mudanças" });
    expect(gravacoes()).toBe(1); // a segunda execução não regravou nada

    expect(logs.map((l) => l.status)).toEqual(["ok", "ok"]);
  });

  it("cookie inválido (401) interrompe o job, não chama os próximos e registra erro", async () => {
    const { repo, produtos, logs } = repoEmMemoria();
    const { chamadas } = px((id) => (id === 12 ? okComFixture() : json([{ error: {} }], 401)));

    const r = await sincronizar([12, 13, 14], { repo, ...semEspera });

    expect(chamadas).toEqual([12, 13]); // parou no 13; o 14 nem foi chamado
    expect(r.status).toBe("com_erros");
    expect(r.relatorio.map((x) => x.status)).toEqual(["atualizado", "erro"]);
    expect(r.relatorio[1].erro).toMatch(/PX_COOKIE/);
    expect(produtos.has(12)).toBe(true); // o que já tinha sido gravado fica
    expect(logs.at(-1)?.status).toBe("com_erros");
  });

  it("UNAUTHORIZED no corpo também interrompe", async () => {
    const { repo } = repoEmMemoria();
    const { chamadas } = px(() =>
      json([{ error: { message: "x", data: { code: "UNAUTHORIZED", httpStatus: 401 } } }], 200)
    );
    const r = await sincronizar([12, 13], { repo, ...semEspera });
    expect(chamadas).toEqual([12]);
    expect(r.status).toBe("com_erros");
  });

  it("resposta com formato quebrado não altera o que já estava salvo", async () => {
    const { repo, produtos, gravacoes } = repoEmMemoria();
    px(okComFixture);
    await sincronizar([12], { repo, ...semEspera });
    const antes = structuredClone(produtos.get(12));
    expect(gravacoes()).toBe(1);

    // a PX "muda a API": devolve o produto sem tableBinds
    px(() => json([{ result: { data: { id: 12, name: "Amil SC" } } }]));
    const r = await sincronizar([12], { repo, ...semEspera });

    expect(r.status).toBe("com_erros");
    expect(r.relatorio[0].status).toBe("erro");
    expect(r.relatorio[0].erro).toMatch(/Formato inesperado/);
    expect(gravacoes()).toBe(1); // nada regravado
    expect(produtos.get(12)).toEqual(antes);
  });

  it("preço inválido no meio da resposta também é rejeitado sem gravar", async () => {
    const { repo, gravacoes } = repoEmMemoria();
    const quebrado = JSON.parse(fixtureTexto);
    const item = Array.isArray(quebrado) ? quebrado[0] : quebrado;
    const produto = item.result.data.json ?? item.result.data;
    produto.tableBinds[3].plans[0].agePrices[2].price = "abc";
    px(() => json(quebrado));

    const r = await sincronizar([12], { repo, ...semEspera });
    expect(r.relatorio[0].status).toBe("erro");
    expect(gravacoes()).toBe(0);
  });

  it("um produto com erro não impede os outros (falha que não é de sessão)", async () => {
    const { repo, produtos } = repoEmMemoria();
    px((id) => (id === 12 ? json({ oops: true }, 500) : okComFixture()));

    const r = await sincronizar([12, 13], { repo, ...semEspera });
    expect(r.relatorio.map((x) => x.status)).toEqual(["erro", "atualizado"]);
    expect(r.status).toBe("com_erros");
    expect(produtos.has(12)).toBe(true); // a fixture sempre traz o produto 12; o job seguiu pro 2º e gravou
  });

  it("espera o intervalo entre produtos (e não depois do último)", async () => {
    const { repo } = repoEmMemoria();
    px(okComFixture);
    const esperar = vi.fn(async () => {});
    await sincronizar([12, 13, 14], { repo, esperar, intervaloMs: 2000 });
    expect(esperar).toHaveBeenCalledTimes(2);
    expect(esperar).toHaveBeenCalledWith(2000);
  });

  it("não deixa duas sincronizações rodarem ao mesmo tempo", async () => {
    const { repo } = repoEmMemoria();
    let liberar!: () => void;
    const trava = new Promise<Response>((res) => {
      liberar = () => res(okComFixture());
    });
    vi.stubGlobal("fetch", vi.fn(() => trava));

    const primeira = sincronizar([12], { repo, ...semEspera });
    await expect(sincronizar([12], { repo, ...semEspera })).rejects.toBeInstanceOf(
      SincronizacaoEmAndamento
    );
    liberar();
    await primeira;
    // liberou o lock: dá pra rodar de novo
    px(okComFixture);
    await expect(sincronizar([12], { repo, ...semEspera })).resolves.toBeDefined();
  });

  it("falha ao gravar o log não derruba o job", async () => {
    const { repo } = repoEmMemoria();
    repo.registrarSync = async () => {
      throw new Error("banco fora");
    };
    px(okComFixture);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await sincronizar([12], { repo, ...semEspera });
    expect(r.status).toBe("ok");
  });

  it("o cookie nunca aparece no relatório", async () => {
    const { repo } = repoEmMemoria();
    px(() => json({ erro: "boom" }, 500));
    const r = await sincronizar([12], { repo, ...semEspera });
    expect(JSON.stringify(r)).not.toContain("SEGREDO");
  });
});

describe("idsDosProdutos", () => {
  it("lê, limpa e remove duplicados", () => {
    expect(idsDosProdutos("12, 15,20,12,abc,0,-3")).toEqual([12, 15, 20]);
  });
  it("exige ao menos um id", () => {
    expect(() => idsDosProdutos("")).toThrow(/PX_PRODUTOS/);
    expect(() => idsDosProdutos(undefined)).toThrow(/PX_PRODUTOS/);
  });
});
