import { describe, expect, it } from "vitest";
import { QUIZ_DEFINITION } from "../definition";
import { FIM, type QuizDefinition } from "../types";
import { QuizDefinitionError, validateQuizDefinition } from "../validate";

function baseDef(): QuizDefinition {
  return {
    primeiraPergunta: "a",
    mensagemAbertura: "Abertura.",
    perguntas: {
      a: {
        corpo: "Pergunta A?",
        opcoes: [
          { id: "a1", titulo: "Opção 1", proxima: "b" },
          { id: "a2", titulo: "Opção 2", proxima: FIM },
        ],
      },
      b: {
        corpo: "Pergunta B?",
        opcoes: [{ id: "b1", titulo: "Ok", proxima: FIM }],
      },
    },
    mensagemFinal: "Fim.",
    mensagemRespostaInvalida: "Toque numa opção.",
    mensagemRespostaInvalidaTexto: "Escreve de novo, por favor.",
    maxRespostasInvalidasSeguidas: 3,
  };
}

describe("validateQuizDefinition", () => {
  it("aceita a definição real do quiz", () => {
    expect(() => validateQuizDefinition(QUIZ_DEFINITION)).not.toThrow();
  });

  it("falha com um título de botão de 21 caracteres", () => {
    const def = baseDef();
    def.perguntas.a.opcoes[0].titulo = "x".repeat(21); // 21 > limite de 20
    expect(() => validateQuizDefinition(def)).toThrow(QuizDefinitionError);
  });

  it("aceita um título de botão de exatamente 20 caracteres", () => {
    const def = baseDef();
    def.perguntas.a.opcoes[0].titulo = "x".repeat(20);
    expect(() => validateQuizDefinition(def)).not.toThrow();
  });

  it("falha quando o corpo + mensagemRespostaInvalida passa de 1024 caracteres", () => {
    const def = baseDef();
    // prefixo (17) + "\n\n" (2) + corpo => precisa passar de 1024 no total
    def.perguntas.a.corpo = "y".repeat(1010);
    expect(() => validateQuizDefinition(def)).toThrow(/resposta inválida/);
  });

  it("falha com mais de 3 botões numa pergunta", () => {
    const def = baseDef();
    def.perguntas.a.opcoes.push({ id: "a3", titulo: "Três", proxima: FIM });
    def.perguntas.a.opcoes.push({ id: "a4", titulo: "Quatro", proxima: FIM });
    expect(() => validateQuizDefinition(def)).toThrow(/botões/);
  });

  it("falha quando proxima aponta para uma pergunta inexistente", () => {
    const def = baseDef();
    def.perguntas.a.opcoes[0].proxima = "nao_existe";
    expect(() => validateQuizDefinition(def)).toThrow(/proxima/);
  });

  it("falha com id de botão repetido no quiz", () => {
    const def = baseDef();
    def.perguntas.b.opcoes[0].id = "a1";
    expect(() => validateQuizDefinition(def)).toThrow(/único/);
  });

  it("falha com título repetido na mesma pergunta", () => {
    const def = baseDef();
    def.perguntas.a.opcoes[1].titulo = def.perguntas.a.opcoes[0].titulo;
    expect(() => validateQuizDefinition(def)).toThrow(/repetido/);
  });

  it("aceita uma pergunta de texto livre (sem opções) com proximaSeTexto válido", () => {
    const def = baseDef();
    def.perguntas.b.opcoes = [];
    def.perguntas.b.proximaSeTexto = FIM;
    expect(() => validateQuizDefinition(def)).not.toThrow();
  });

  it("falha quando uma pergunta de texto livre não tem proximaSeTexto válido", () => {
    const def = baseDef();
    def.perguntas.b.opcoes = [];
    def.perguntas.b.proximaSeTexto = "nao_existe";
    expect(() => validateQuizDefinition(def)).toThrow(/proximaSeTexto/);
  });

  it("falha quando mensagemAbertura está vazia", () => {
    const def = baseDef();
    def.mensagemAbertura = "";
    expect(() => validateQuizDefinition(def)).toThrow(/mensagemAbertura/);
  });

  it("falha quando mensagemRespostaInvalidaTexto está vazia", () => {
    const def = baseDef();
    def.mensagemRespostaInvalidaTexto = "";
    expect(() => validateQuizDefinition(def)).toThrow(/mensagemRespostaInvalidaTexto/);
  });
});
