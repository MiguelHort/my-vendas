import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  FormatoInesperado,
  extrairProdutoDaResposta,
  normalizarProduto,
  type PxProdutoBruto,
} from "../normalizar";

const bruto = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/amil-sc.json"), "utf8")
) as unknown;
const produto = extrairProdutoDaResposta(bruto) as PxProdutoBruto;

describe("normalizarProduto (fixture real do Amil SC)", () => {
  const { tabelas, planos, hash } = normalizarProduto(produto);

  it("normaliza 60 tabelas, 24 planos e 4.260 preços", () => {
    expect(tabelas).toHaveLength(60);
    expect(planos).toHaveLength(24);
    const precos = tabelas.reduce(
      (s, t) => s + t.planos.reduce((s2, p) => s2 + p.precos.length, 0),
      0
    );
    expect(precos).toBe(4260);
  });

  it("marca como inconsistentes exatamente as tabelas conhecidas", () => {
    const inconsistentes = tabelas
      .filter((t) => t.inconsistencias.length > 0)
      .map((t) => t.px_tabela_id)
      .sort((a, b) => a - b);
    expect(inconsistentes).toEqual([434, 5245, 5253, 5269, 8261, 8262]);
  });

  it("gera um hash SHA-256 estável, igual ao da implementação de referência", () => {
    expect(normalizarProduto(produto).hash).toBe(hash);
    expect(hash).toBe("bb35ee5086f40638562bf4263481d31ac2a82bb6e28e6d76cc45136c66ee87a2");
  });

  it("o hash muda quando um preço muda", () => {
    const alterado = structuredClone(produto);
    alterado.tableBinds[0].plans![0].agePrices![0].price! += 1;
    expect(normalizarProduto(alterado).hash).not.toBe(hash);
  });

  it("guarda a faixa de vidas inválida da PX (30 a 29) como inconsistência", () => {
    const invalidas = tabelas.filter((t) => t.vidas_max < t.vidas_min);
    expect(invalidas.length).toBeGreaterThan(0);
    for (const t of invalidas) {
      expect(t.inconsistencias.some((i) => i.includes("faixa de vidas inválida"))).toBe(true);
    }
  });
});

describe("validação de estrutura", () => {
  it("rejeita produto vazio ou sem tabelas", () => {
    expect(() => normalizarProduto(null)).toThrow(FormatoInesperado);
    expect(() => normalizarProduto({ id: 12 })).toThrow(FormatoInesperado);
    expect(() => normalizarProduto({ id: 12, tableBinds: [] })).toThrow(FormatoInesperado);
    expect(() => normalizarProduto({ tableBinds: [{}] })).toThrow(FormatoInesperado);
  });

  it("rejeita preço nulo, plano sem preços e tabela sem faixa de vidas", () => {
    const semPreco = structuredClone(produto);
    (semPreco.tableBinds[0].plans![0].agePrices![0] as { price: unknown }).price = null;
    expect(() => normalizarProduto(semPreco)).toThrow(FormatoInesperado);

    const semAgePrices = structuredClone(produto);
    semAgePrices.tableBinds[0].plans![0].agePrices = [];
    expect(() => normalizarProduto(semAgePrices)).toThrow(FormatoInesperado);

    const semVidas = structuredClone(produto);
    (semVidas.tableBinds[0].valueTable as unknown as { lifeAmountMin: unknown }).lifeAmountMin = "2";
    expect(() => normalizarProduto(semVidas)).toThrow(FormatoInesperado);
  });
});

describe("extrairProdutoDaResposta", () => {
  it("acha o produto nos formatos sem e com superjson", () => {
    expect(extrairProdutoDaResposta([{ result: { data: produto } }])).toBe(produto);
    expect(extrairProdutoDaResposta([{ result: { data: { json: produto } } }])).toBe(produto);
  });

  it("lança FormatoInesperado quando nenhum item tem tableBinds", () => {
    expect(() => extrairProdutoDaResposta([{ result: { data: { id: 1 } } }])).toThrow(
      FormatoInesperado
    );
  });
});
