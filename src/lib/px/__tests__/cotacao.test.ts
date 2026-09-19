import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { extrairProdutoDaResposta, normalizarProduto } from "../normalizar";
import {
  EntradaInvalida,
  calcularCotacao,
  parseEntrada,
  validarIdades,
  type EntradaCotacao,
} from "../cotacao";

// Valores esperados conferidos manualmente contra o JSON real da PX (fixture do Amil SC).
const bruto = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/amil-sc.json"), "utf8")
) as unknown;
const { tabelas } = normalizarProduto(extrairProdutoDaResposta(bruto));
const idades35 = Array.from({ length: 35 }, (_, i) => 20 + i); // 20 a 54 anos

const cotar = (entrada: EntradaCotacao, opcoes?: Parameters<typeof calcularCotacao>[2]) =>
  calcularCotacao(tabelas, entrada, opcoes);

describe("calcularCotacao — casos obrigatórios (Amil SC)", () => {
  it("#1: 3 vidas (34, 31, 4), empresa não MEI", () => {
    const { resultados } = cotar({ idades: [34, 31, 4], mei: false, modalidade: "PME" });
    expect(resultados).toHaveLength(61);
    const [maisBarata] = resultados;
    expect(maisBarata.plano).toBe("Amil Prata");
    expect(maisBarata.acomodacao).toBe("Enfermaria");
    expect(maisBarata.coparticipacao).toBe("Completa 40%");
    expect(maisBarata.referencia.px_tabela_id).toBe(5256);
    expect(maisBarata.total).toBe(1070.01);
    expect(maisBarata.detalhamento.map((d) => d.valor)).toEqual([426.57, 406.26, 237.18]);
    expect(resultados.at(-1)!.total).toBe(9333.28);
  });

  it("#2: 4 vidas (45, 42, 17, 15), empresa MEI usa só tabelas MEI", () => {
    const { resultados } = cotar({ idades: [45, 42, 17, 15], mei: true, modalidade: "PME" });
    expect(resultados).toHaveLength(39);
    expect(resultados.every((r) => r.mei === true)).toBe(true);
    expect(resultados[0].total).toBe(1828.59);
    expect(resultados[0].referencia.px_tabela_id).toBe(5257);
  });

  it("#3: 35 vidas em livre adesão exclui tabelas com faixa de vidas inválida", () => {
    const { resultados } = cotar({
      idades: idades35,
      mei: false,
      modalidade: "PME",
      contratacao: "Opcional/Livre Adesão",
    });
    expect(resultados).toHaveLength(13);
    expect(resultados[0].total).toBe(16982.93);
    expect(resultados[0].referencia.px_tabela_id).toBe(5261);
  });

  it("#4: 35 vidas em livre adesão com tratar_como_sem_maximo", () => {
    const { resultados } = cotar(
      { idades: idades35, mei: false, modalidade: "PME", contratacao: "Opcional/Livre Adesão" },
      { tabelasComVidasInvalidas: "tratar_como_sem_maximo" }
    );
    expect(resultados).toHaveLength(55);
  });

  it("#5: 35 vidas, compulsório, coparticipação parcial, linha Black", () => {
    const { resultados } = cotar({
      idades: idades35,
      mei: false,
      modalidade: "PME",
      contratacao: "Compulsório",
      coparticipacao: "Parcial",
      linha: "Black",
    });
    expect(resultados).toHaveLength(11);
    expect(resultados[0].plano).toBe("Black I R1");
    expect(resultados[0].referencia.px_tabela_id).toBe(8260);
    expect(resultados[0].total).toBe(52184.37);
  });

  it("#6: 2 vidas (60, 58), apartamento, linha Selecionada", () => {
    const { resultados } = cotar({
      idades: [60, 58],
      mei: false,
      modalidade: "PME",
      acomodacao: "Apartamento",
      linha: "Selecionada",
    });
    expect(resultados).toHaveLength(15);
    expect(resultados.every((r) => r.acomodacao === "Apartamento")).toBe(true);
    expect(resultados[0].plano).toBe("Amil S380");
    expect(resultados[0].referencia.px_tabela_id).toBe(5243);
    expect(resultados[0].total).toBe(2739.91);
  });

  it("#7: Adesão, 1 vida de 40 anos", () => {
    const { resultados } = cotar({ idades: [40], modalidade: "Adesão" });
    expect(resultados).toHaveLength(4);
    expect(resultados[0].plano).toBe("Amil Prata");
    expect(resultados[0].acomodacao).toBe("Enfermaria");
    expect(resultados[0].referencia.px_tabela_id).toBe(5270);
    expect(resultados[0].total).toBe(779.89);
  });
});

describe("calcularCotacao — regras", () => {
  it("resultados vêm ordenados do menor para o maior total", () => {
    const { resultados } = cotar({ idades: [34, 31, 4], mei: false, modalidade: "PME" });
    for (let i = 1; i < resultados.length; i++) {
      expect(resultados[i].total).toBeGreaterThanOrEqual(resultados[i - 1].total);
    }
  });

  it("subtotal = soma do detalhamento em centavos, sem erro de ponto flutuante", () => {
    const { resultados } = cotar({ idades: [34, 31, 4], mei: false, modalidade: "PME" });
    for (const r of resultados) {
      const centavos = r.detalhamento.reduce((s, d) => s + Math.round(d.valor * 100), 0);
      expect(Math.round(r.subtotal * 100)).toBe(centavos);
      expect(Math.round(r.total * 100)).toBe(centavos - Math.round(r.desconto * 100));
    }
  });

  it("aplica o desconto percentual da tabela (arredondado em centavos)", () => {
    const comDesconto = tabelas.map((t) => ({ ...t, desconto_percentual: 10 }));
    const sem = calcularCotacao(tabelas, { idades: [34, 31, 4], mei: false, modalidade: "PME" });
    const com = calcularCotacao(comDesconto, { idades: [34, 31, 4], mei: false, modalidade: "PME" });
    const a = sem.resultados.find((r) => r.referencia.px_vinculo_id === com.resultados[0].referencia.px_vinculo_id)!;
    expect(com.resultados[0].desconto).toBeGreaterThan(0);
    expect(Math.round(com.resultados[0].desconto * 100)).toBe(Math.round(a.subtotal * 100 * 0.1));
  });

  it("devolve a lista de tabelas descartadas com o motivo", () => {
    const { excluidas } = cotar({ idades: idades35, mei: false, modalidade: "PME" });
    expect(excluidas.length).toBeGreaterThan(0);
    expect(excluidas.every((e) => e.motivo.length > 0)).toBe(true);
    expect(excluidas.some((e) => e.motivo.startsWith("faixa de vidas inválida"))).toBe(true);

    // motivo MEI aparece quando a quantidade de vidas serve (3 vidas, empresa comum)
    const tres = cotar({ idades: [34, 31, 4], mei: false, modalidade: "PME" });
    expect(tres.excluidas.some((e) => e.motivo === "tabela exclusiva para MEI")).toBe(true);
  });

  it("descarta tabela fora da vigência", () => {
    const vencidas = tabelas.map((t) => ({ ...t, vigencia_fim: "2020-01-01T00:00:00.000Z" }));
    const { resultados, excluidas } = calcularCotacao(vencidas, {
      idades: [34, 31, 4],
      mei: false,
      modalidade: "PME",
    });
    expect(resultados).toHaveLength(0);
    expect(excluidas.some((e) => e.motivo === "tabela vencida")).toBe(true);

    const futuras = tabelas.map((t) => ({ ...t, vigencia_inicio: "2999-01-01T00:00:00.000Z" }));
    expect(
      calcularCotacao(futuras, { idades: [34], modalidade: "PME" }).excluidas.some(
        (e) => e.motivo === "tabela ainda não vigente"
      )
    ).toBe(true);
  });

  it("tabelas de idade única e ocultas ficam de fora", () => {
    const so1 = tabelas.map((t) => ({ ...t, idade_unica: true }));
    expect(calcularCotacao(so1, { idades: [34], modalidade: "PME" }).resultados).toHaveLength(0);
    const ocultas = tabelas.map((t) => ({ ...t, visivel: false }));
    expect(calcularCotacao(ocultas, { idades: [34], modalidade: "PME" }).resultados).toHaveLength(0);
  });

  it("filtro por entidade de classe (Adesão)", () => {
    const comEntidade = tabelas.map((t) => ({
      ...t,
      entidades: [{ sigla: "UNICOM", nome: "Unicom", profissoes: [] }],
    }));
    const ok = calcularCotacao(comEntidade, { idades: [40], modalidade: "Adesão", entidade: "UNICOM" });
    expect(ok.resultados).toHaveLength(4);
    const outra = calcularCotacao(comEntidade, { idades: [40], modalidade: "Adesão", entidade: "OUTRA" });
    expect(outra.resultados).toHaveLength(0);
  });
});

describe("validação de idades", () => {
  it("rejeita idades vazias, negativas, não numéricas, decimais e acima de 120", () => {
    expect(() => cotar({ idades: [] })).toThrow();
    expect(() => cotar({ idades: [30, -1] })).toThrow();
    expect(() => cotar({ idades: [30, "abc" as unknown as number] })).toThrow();
    expect(() => validarIdades([30.5])).toThrow(EntradaInvalida);
    expect(() => validarIdades([121])).toThrow(EntradaInvalida);
    expect(() => validarIdades([null])).toThrow(EntradaInvalida);
    expect(() => validarIdades(["", 3])).toThrow(EntradaInvalida);
    expect(() => validarIdades(undefined)).toThrow(EntradaInvalida);
  });

  it("aceita 0 a 120 e números em texto", () => {
    expect(validarIdades([0, 120, "35"])).toEqual([0, 120, 35]);
  });
});

describe("parseEntrada (entrada vinda da API)", () => {
  it("mantém só os campos conhecidos e limpa texto", () => {
    const e = parseEntrada({
      idades: [34, "31"],
      mei: true,
      modalidade: "PME",
      contratacao: "  Compulsório ",
      linha: "Black",
      hacker: "<script>",
    });
    expect(e).toEqual({
      idades: [34, 31],
      mei: true,
      modalidade: "PME",
      contratacao: "Compulsório",
      linha: "Black",
    });
  });

  it("rejeita modalidade desconhecida, data inválida e corpo vazio", () => {
    expect(() => parseEntrada({ idades: [30], modalidade: "PF" })).toThrow(EntradaInvalida);
    expect(() => parseEntrada({ idades: [30], data: "amanhã" })).toThrow(EntradaInvalida);
    expect(() => parseEntrada(null)).toThrow(EntradaInvalida);
    expect(() => parseEntrada({})).toThrow(EntradaInvalida);
  });
});
