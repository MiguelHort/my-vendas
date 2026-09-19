import { describe, expect, it } from "vitest";
import { chaveOpcao, extrairIdades, resumoEntrada } from "../comum";

describe("extrairIdades (colar uma lista)", () => {
  it("aceita vírgula, espaço, ponto e vírgula e 'e'", () => {
    expect(extrairIdades("34, 31, 4").validas).toEqual([34, 31, 4]);
    expect(extrairIdades("34 31 4").validas).toEqual([34, 31, 4]);
    expect(extrairIdades("34;31;4").validas).toEqual([34, 31, 4]);
    expect(extrairIdades("34, 31 e 4").validas).toEqual([34, 31, 4]);
    expect(extrairIdades("45\n42\n17").validas).toEqual([45, 42, 17]);
  });

  it("separa as inválidas (fora de 0 a 120 ou negativas)", () => {
    const r = extrairIdades("30, 150, -2, 0, 120");
    expect(r.validas).toEqual([30, 0, 120]);
    expect(r.invalidas).toEqual(["150", "-2"]);
  });

  it("texto sem número não gera idade", () => {
    expect(extrairIdades("abc")).toEqual({ validas: [], invalidas: [] });
    expect(extrairIdades("")).toEqual({ validas: [], invalidas: [] });
  });
});

describe("resumoEntrada", () => {
  it("descreve as opções escolhidas", () => {
    expect(
      resumoEntrada({
        idades: [30],
        modalidade: "PME",
        mei: false,
        contratacao: "Compulsório",
        acomodacao: "Apartamento",
        linha: "Black",
      })
    ).toBe("PME · não MEI · Compulsório · Apartamento · linha Black");
    expect(resumoEntrada({ idades: [30], modalidade: "Adesão", entidade: "UNICOM" })).toBe(
      "Adesão · entidade UNICOM"
    );
    expect(resumoEntrada({ idades: [30] })).toBe("");
  });
});

describe("chaveOpcao", () => {
  it("identifica uma opção por vínculo + plano", () => {
    expect(
      chaveOpcao({
        referencia: { px_vinculo_id: 322713, px_tabela_id: 5247, px_plano_id: 283 },
      } as Parameters<typeof chaveOpcao>[0])
    ).toBe("322713:283");
  });
});
