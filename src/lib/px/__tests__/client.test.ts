import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessaoExpirada, buscarProduto } from "../client";

const COOKIE = "sessao=SEGREDO-NAO-VAZAR";

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubEnv("PX_COOKIE", COOKIE);
  vi.stubEnv("PX_PROC_PRODUTO", "produtoCompleto");
  vi.stubEnv("PX_BASE_URL", "https://px.exemplo/api/trpc/");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("buscarProduto", () => {
  it("monta a URL tRPC em lote e manda o cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaJson([{ result: { data: { id: 12 } } }]));
    vi.stubGlobal("fetch", fetchMock);

    const dados = await buscarProduto(12);

    expect(dados).toEqual({ id: 12 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://px.exemplo/api/trpc/produtoCompleto?batch=1&input=${encodeURIComponent('{"0":{"id":12}}')}`
    );
    expect((init as RequestInit).headers).toMatchObject({ cookie: COOKIE });
  });

  it("entende o formato com superjson (result.data.json)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respostaJson([{ result: { data: { json: { id: 7 } } } }]))
    );
    expect(await buscarProduto(7)).toEqual({ id: 7 });
  });

  it("HTTP 401 vira SessaoExpirada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson([{ error: {} }], 401)));
    await expect(buscarProduto(12)).rejects.toBeInstanceOf(SessaoExpirada);
  });

  it("UNAUTHORIZED no corpo (mesmo com HTTP 200) vira SessaoExpirada", async () => {
    const corpo = [{ error: { message: "x", code: -32001, data: { code: "UNAUTHORIZED", httpStatus: 401 } } }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaJson(corpo, 200)));
    await expect(buscarProduto(12)).rejects.toBeInstanceOf(SessaoExpirada);
  });

  it("outros erros viram Error comum e não vazam o cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respostaJson([{ error: { message: "quebrou", data: { code: "INTERNAL_SERVER_ERROR" } } }], 500))
    );
    const erro = await buscarProduto(12).catch((e: Error) => e);
    expect(erro).toBeInstanceOf(Error);
    expect(erro).not.toBeInstanceOf(SessaoExpirada);
    expect((erro as Error).message).toContain("HTTP 500");
    expect((erro as Error).message).not.toContain("SEGREDO");
  });

  it("resposta que não é JSON falha sem vazar o cookie", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 502 })));
    const erro = (await buscarProduto(12).catch((e: Error) => e)) as Error;
    expect(erro.message).toContain("HTTP 502");
    expect(erro.message).not.toContain("SEGREDO");
  });

  it("exige PX_COOKIE e PX_PROC_PRODUTO", async () => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("PX_COOKIE", "");
    await expect(buscarProduto(12)).rejects.toThrow(/PX_COOKIE/);
    vi.stubEnv("PX_COOKIE", COOKIE);
    vi.stubEnv("PX_PROC_PRODUTO", "");
    await expect(buscarProduto(12)).rejects.toThrow(/PX_PROC_PRODUTO/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["brokerUser", "activeTenant", "notificationsPoll", "activeTenant,brokerUser,produto"])(
    "recusa chamar a procedure proibida %s",
    async (proibida) => {
      vi.stubGlobal("fetch", vi.fn());
      vi.stubEnv("PX_PROC_PRODUTO", proibida);
      await expect(buscarProduto(12)).rejects.toThrow(/não é permitida/);
      expect(fetch).not.toHaveBeenCalled();
    }
  );
});
