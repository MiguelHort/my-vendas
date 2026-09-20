import { describe, expect, it } from "vitest";
import { candidatosDeModelo, deveTentarOutroModelo } from "../audioTranscription";

describe("candidatosDeModelo", () => {
  it("põe o configurado primeiro e depois os de reserva, sem repetir", () => {
    expect(candidatosDeModelo("gemini-2.0-flash")).toEqual([
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash",
    ]);
    expect(candidatosDeModelo("gemini-flash-latest")).toEqual([
      "gemini-flash-latest",
      "gemini-2.5-flash",
    ]);
  });

  it("sem configuração usa só os de reserva", () => {
    expect(candidatosDeModelo(undefined)).toEqual(["gemini-flash-latest", "gemini-2.5-flash"]);
    expect(candidatosDeModelo("  ")).toEqual(["gemini-flash-latest", "gemini-2.5-flash"]);
  });
});

describe("deveTentarOutroModelo", () => {
  it("modelo aposentado, sobrecarga, cota e erro do servidor: tenta o próximo", () => {
    for (const status of [404, 429, 500, 503]) {
      expect(deveTentarOutroModelo({ status })).toBe(true);
    }
  });

  it("chave inválida ou requisição ruim: não adianta trocar de modelo", () => {
    for (const status of [400, 401, 403]) {
      expect(deveTentarOutroModelo({ status })).toBe(false);
    }
  });

  it("sem status, lê o código na mensagem do SDK", () => {
    expect(
      deveTentarOutroModelo(new Error("[GoogleGenerativeAI Error]: ... [404 Not Found] no longer available"))
    ).toBe(true);
    expect(deveTentarOutroModelo(new Error("[GoogleGenerativeAI Error]: ... [403 Forbidden]"))).toBe(false);
    expect(deveTentarOutroModelo(new Error("timeout"))).toBe(false);
  });
});
