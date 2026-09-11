import { FIM, type QuizDefinition } from "./types";

/** Limites da mensagem `interactive` do tipo `button` na Cloud API da Meta. */
export const META_LIMITS = {
  maxButtons: 3,
  maxButtonTitle: 20,
  maxButtonId: 256,
  maxBody: 1024,
} as const;

/** Separador entre o aviso de resposta inválida e o corpo original da pergunta. */
export const INVALID_PREFIX_SEPARATOR = "\n\n";

export class QuizDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizDefinitionError";
  }
}

/**
 * Conta caracteres por code point (spread), não por unidade UTF-16 — assim um
 * emoji conta como 1, ficando mais perto de como a Meta conta e evitando falso
 * positivo por causa de acento (é, ç…).
 */
export function charLen(s: string): number {
  return [...s].length;
}

/**
 * Valida a definição do quiz contra os limites da Meta e a consistência do grafo.
 * Lança `QuizDefinitionError` na primeira violação.
 *
 * Também checa o corpo *com* `mensagemRespostaInvalida` no início, porque o reenvio
 * de resposta inválida é uma única mensagem com esse prefixo.
 */
export function validateQuizDefinition(def: QuizDefinition): void {
  const fail = (msg: string): never => {
    throw new QuizDefinitionError(msg);
  };

  if (!def.primeiraPergunta || !def.perguntas[def.primeiraPergunta]) {
    fail(`primeiraPergunta "${def.primeiraPergunta}" não existe em perguntas.`);
  }

  if (!Number.isInteger(def.maxRespostasInvalidasSeguidas) || def.maxRespostasInvalidasSeguidas < 1) {
    fail("maxRespostasInvalidasSeguidas deve ser um inteiro >= 1.");
  }

  if (typeof def.mensagemFinal !== "string" || def.mensagemFinal.trim() === "") {
    fail("mensagemFinal está vazia.");
  }
  if (typeof def.mensagemRespostaInvalida !== "string" || def.mensagemRespostaInvalida.trim() === "") {
    fail("mensagemRespostaInvalida está vazia.");
  }

  const stepIds = Object.keys(def.perguntas);
  const seenOptionIds = new Set<string>();

  for (const step of stepIds) {
    const q = def.perguntas[step];

    // corpo
    if (typeof q.corpo !== "string" || q.corpo.trim() === "") {
      fail(`Pergunta "${step}": corpo vazio.`);
    }
    if (charLen(q.corpo) > META_LIMITS.maxBody) {
      fail(
        `Pergunta "${step}": corpo tem ${charLen(q.corpo)} caracteres (máx ${META_LIMITS.maxBody}).`
      );
    }
    const withPrefix =
      def.mensagemRespostaInvalida + INVALID_PREFIX_SEPARATOR + q.corpo;
    if (charLen(withPrefix) > META_LIMITS.maxBody) {
      fail(
        `Pergunta "${step}": corpo com mensagemRespostaInvalida no início tem ${charLen(withPrefix)} caracteres (máx ${META_LIMITS.maxBody}).`
      );
    }

    // opções
    if (!Array.isArray(q.opcoes) || q.opcoes.length < 1) {
      fail(`Pergunta "${step}": precisa de pelo menos 1 opção.`);
    }
    if (q.opcoes.length > META_LIMITS.maxButtons) {
      fail(
        `Pergunta "${step}": ${q.opcoes.length} botões (máx ${META_LIMITS.maxButtons}).`
      );
    }

    const titlesInQuestion = new Set<string>();
    for (const opt of q.opcoes) {
      if (!opt.id || charLen(opt.id) > META_LIMITS.maxButtonId) {
        fail(
          `Pergunta "${step}": id de botão "${opt.id}" inválido (máx ${META_LIMITS.maxButtonId} caracteres).`
        );
      }
      if (seenOptionIds.has(opt.id)) {
        fail(`id de botão "${opt.id}" repetido no quiz (precisa ser único).`);
      }
      seenOptionIds.add(opt.id);

      if (!opt.titulo || charLen(opt.titulo) > META_LIMITS.maxButtonTitle) {
        fail(
          `Pergunta "${step}": título "${opt.titulo}" tem ${opt.titulo ? charLen(opt.titulo) : 0} caracteres (máx ${META_LIMITS.maxButtonTitle}).`
        );
      }
      if (titlesInQuestion.has(opt.titulo)) {
        fail(`Pergunta "${step}": título de botão "${opt.titulo}" repetido na mesma pergunta.`);
      }
      titlesInQuestion.add(opt.titulo);

      if (opt.proxima !== FIM && !def.perguntas[opt.proxima]) {
        fail(
          `Pergunta "${step}", opção "${opt.id}": proxima "${opt.proxima}" não é uma pergunta existente nem "${FIM}".`
        );
      }
    }
  }
}
