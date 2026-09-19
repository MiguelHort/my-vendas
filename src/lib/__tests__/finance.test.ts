import { describe, expect, it } from "vitest";
import {
  fixedCostActiveInMonth,
  monthBounds,
  parseMoney,
  shiftMonth,
  splitBySocios,
  summarize,
} from "../finance";

describe("splitBySocios", () => {
  it("divide 40/60", () => {
    const [miguel, victor] = splitBySocios(1000);
    expect(miguel.valor).toBe(400);
    expect(victor.valor).toBe(600);
  });

  it("sempre soma exatamente o total, sem perder centavo", () => {
    for (const total of [0.01, 0.03, 100.01, 1234.57, -50.03]) {
      const soma = splitBySocios(total).reduce((a, s) => a + Math.round(s.valor * 100), 0);
      expect(soma).toBe(Math.round(total * 100));
    }
  });

  it("resultado negativo vira prejuízo dividido igual", () => {
    const [miguel, victor] = splitBySocios(-1000);
    expect(miguel.valor).toBe(-400);
    expect(victor.valor).toBe(-600);
  });
});

describe("summarize", () => {
  it("entradas - (fixas + eventuais) = resultado", () => {
    const s = summarize(
      [
        { tipo: "ENTRADA", valor: 5000 },
        { tipo: "ENTRADA", valor: 1000.5 },
        { tipo: "DESPESA_EVENTUAL", valor: 200.25 },
      ],
      [{ valor: 1500 }, { valor: 300 }]
    );
    expect(s.entradas).toBe(6000.5);
    expect(s.despesasEventuais).toBe(200.25);
    expect(s.despesasFixas).toBe(1800);
    expect(s.despesas).toBe(2000.25);
    expect(s.resultado).toBe(4000.25);
    expect(s.socios[0].valor + s.socios[1].valor).toBeCloseTo(4000.25, 2);
  });

  it("sem lançamentos zera tudo", () => {
    const s = summarize([], []);
    expect(s.resultado).toBe(0);
    expect(s.socios.every((x) => x.valor === 0)).toBe(true);
  });
});

describe("meses", () => {
  it("shiftMonth atravessa o ano", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("monthBounds respeita fevereiro", () => {
    expect(monthBounds("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthBounds("2026-02").end).toBe("2026-02-28");
  });

  it("conta fixa vale de inicio até fim, inclusive", () => {
    const c = { inicio: "2026-03", fim: "2026-06" };
    expect(fixedCostActiveInMonth(c, "2026-02")).toBe(false);
    expect(fixedCostActiveInMonth(c, "2026-03")).toBe(true);
    expect(fixedCostActiveInMonth(c, "2026-06")).toBe(true);
    expect(fixedCostActiveInMonth(c, "2026-07")).toBe(false);
    expect(fixedCostActiveInMonth({ inicio: "2026-03", fim: null }, "2030-01")).toBe(true);
  });
});

describe("parseMoney", () => {
  it("aceita formatos BR e US", () => {
    expect(parseMoney("1.234,56")).toBe(1234.56);
    expect(parseMoney("1234.56")).toBe(1234.56);
    expect(parseMoney(99.9)).toBe(99.9);
  });
  it("rejeita inválidos, zero e negativos", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney(0)).toBeNull();
    expect(parseMoney(-5)).toBeNull();
    expect(parseMoney(null)).toBeNull();
  });
});
