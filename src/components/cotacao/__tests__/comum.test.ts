import { describe, expect, it } from "vitest";
import { agruparPorFaixa, chaveOpcao, extrairIdades, resumoEntrada, rotuloTabela } from "../comum";

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

describe("agruparPorFaixa (linhas do cartão da proposta)", () => {
  it("junta beneficiários da mesma faixa e valor, como a proposta da PX", () => {
    expect(
      agruparPorFaixa([
        { idade: 60, faixa: "59+", valor: 1201.91 },
        { idade: 65, faixa: "59+", valor: 1201.91 },
      ])
    ).toEqual([{ faixa: "59 a 100", qtd: 2, valor: 1201.91 }]);
  });

  it("ordena pela idade inicial e mantém faixas diferentes separadas", () => {
    const linhas = agruparPorFaixa([
      { idade: 45, faixa: "44 a 48", valor: 900 },
      { idade: 4, faixa: "0 a 18", valor: 237.18 },
      { idade: 34, faixa: "34 a 38", valor: 426.57 },
      { idade: 10, faixa: "0 a 18", valor: 237.18 },
    ]);
    expect(linhas.map((l) => [l.faixa, l.qtd])).toEqual([
      ["0 a 18", 2],
      ["34 a 38", 1],
      ["44 a 48", 1],
    ]);
  });

  it("o total das linhas bate com a soma dos beneficiários", () => {
    const det = [
      { idade: 34, faixa: "34 a 38", valor: 426.57 },
      { idade: 31, faixa: "29 a 33", valor: 406.26 },
      { idade: 4, faixa: "0 a 18", valor: 237.18 },
    ];
    const total = agruparPorFaixa(det).reduce((s, l) => s + Math.round(l.qtd * l.valor * 100), 0);
    expect(total).toBe(107001);
  });
});

describe("rotuloTabela", () => {
  it("monta 'Completa | Sem obstetrícia | Black'", () => {
    expect(
      rotuloTabela({ coparticipacao: "Completa", obstetricia: false, linha: "Black", contratacao: null })
    ).toBe("Completa | Sem obstetrícia | Black");
  });
  it("ignora contratação Indiferente e cotações antigas sem o campo obstetrícia", () => {
    expect(
      rotuloTabela({ coparticipacao: "Parcial", linha: "Amil", contratacao: "Indiferente" })
    ).toBe("Parcial | Amil");
    expect(
      rotuloTabela({ coparticipacao: null, obstetricia: true, linha: null, contratacao: "Compulsório" })
    ).toBe("Com obstetrícia | Compulsório");
  });
});
