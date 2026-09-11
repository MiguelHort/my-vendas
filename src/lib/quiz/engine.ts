import { DERIVACAO, QUIZ_DEFINITION } from "./definition";
import { INVALID_PREFIX_SEPARATOR } from "./validate";
import {
  FIM,
  type NecessidadePrincipal,
  type QuizAdvanceResult,
  type QuizDefinition,
  type QuizInboundEvent,
  type QuizOption,
  type QuizOutboundAction,
  type QuizState,
} from "./types";

type AdvanceOptions = {
  def?: QuizDefinition;
  now?: () => Date;
};

function optionInStep(def: QuizDefinition, step: string, optionId: string): QuizOption | undefined {
  return def.perguntas[step]?.opcoes.find((o) => o.id === optionId);
}

function buildSendQuestion(
  def: QuizDefinition,
  step: string,
  { withInvalidPrefix }: { withInvalidPrefix: boolean }
): QuizOutboundAction {
  const q = def.perguntas[step];
  const body = withInvalidPrefix
    ? def.mensagemRespostaInvalida + INVALID_PREFIX_SEPARATOR + q.corpo
    : q.corpo;
  return {
    type: "send_question",
    step,
    body,
    buttons: q.opcoes.map((o) => ({ id: o.id, title: o.titulo })),
  };
}

/** Calcula os campos derivados a partir das respostas (rodado ao concluir). */
export function computeDerived(answers: QuizState["answers"]): {
  temPlanoAtual: boolean;
  necessidadePrincipal: NecessidadePrincipal | null;
} {
  const temPlanoAtual = answers.some(
    (a) =>
      a.step === DERIVACAO.temPlanoAtual.step &&
      a.optionId === DERIVACAO.temPlanoAtual.quandoOptionId
  );

  let necessidadePrincipal: NecessidadePrincipal | null = null;
  for (const a of answers) {
    if (DERIVACAO.necessidade.prevencao.includes(a.optionId)) necessidadePrincipal = "prevencao";
    else if (DERIVACAO.necessidade.tratamento.includes(a.optionId)) necessidadePrincipal = "tratamento";
  }

  return { temPlanoAtual, necessidadePrincipal };
}

/**
 * Núcleo do quiz — função pura. Dado o estado atual e um evento de entrada,
 * devolve o novo estado e as mensagens a enviar. Não toca banco nem rede.
 */
export function advance(
  state: QuizState,
  event: QuizInboundEvent,
  { def = QUIZ_DEFINITION, now = () => new Date() }: AdvanceOptions = {}
): QuizAdvanceResult {
  const nowIso = () => now().toISOString();
  const noop: QuizAdvanceResult = { state, outbound: [], completed: false };

  // Concluído/interrompido: nunca reage (o quiz não volta).
  if (state.status !== "EM_ANDAMENTO" || !state.currentStep) {
    return noop;
  }

  const step = state.currentStep;
  const question = def.perguntas[step];
  if (!question) {
    // Definição foi editada e removeu a etapa atual: interrompe com segurança.
    return {
      state: { ...state, status: "INTERROMPIDO", currentStep: null, lastQuestionWamid: null },
      outbound: [],
      completed: false,
    };
  }

  // (A) A pergunta atual ainda não foi entregue (primeiro contato) ou o envio
  //     anterior falhou. Qualquer mensagem só faz (re)enviar a pergunta atual —
  //     sem processar conteúdo, sem contador.
  if (state.lastQuestionWamid === null) {
    return {
      state,
      outbound: [buildSendQuestion(def, step, { withInvalidPrefix: false })],
      completed: false,
    };
  }

  // (B) Clique em botão.
  if (event.kind === "button_reply") {
    const opt = optionInStep(def, step, event.id);
    const isCurrentAnswer = opt !== undefined && event.contextId === state.lastQuestionWamid;

    if (!isCurrentAnswer) {
      // Botão antigo, de outra pergunta ou com contexto que não bate: não altera
      // nenhuma resposta, só reenvia a pergunta atual (sem prefixo, sem contador).
      return {
        state,
        outbound: [buildSendQuestion(def, step, { withInvalidPrefix: false })],
        completed: false,
      };
    }

    const answers = [
      ...state.answers,
      { step, optionId: opt.id, optionTitle: opt.titulo, at: nowIso() },
    ];

    if (opt.proxima === FIM) {
      const derived = computeDerived(answers);
      return {
        state: {
          ...state,
          status: "CONCLUIDO",
          currentStep: null,
          lastQuestionWamid: null,
          invalidCount: 0,
          answers,
          temPlanoAtual: derived.temPlanoAtual,
          necessidadePrincipal: derived.necessidadePrincipal,
          completedAt: nowIso(),
        },
        outbound: [{ type: "send_text", body: def.mensagemFinal }],
        completed: true,
      };
    }

    return {
      state: {
        ...state,
        currentStep: opt.proxima,
        lastQuestionWamid: null, // a próxima pergunta ainda vai ser enviada
        invalidCount: 0,
        answers,
      },
      outbound: [buildSendQuestion(def, opt.proxima, { withInvalidPrefix: false })],
      completed: false,
    };
  }

  // (C) Não é botão (texto, áudio, imagem, figurinha…): resposta inválida.
  const invalidCount = state.invalidCount + 1;

  if (invalidCount >= def.maxRespostasInvalidasSeguidas) {
    return {
      state: {
        ...state,
        status: "INTERROMPIDO",
        currentStep: null,
        lastQuestionWamid: null,
        invalidCount,
      },
      outbound: [],
      completed: false,
    };
  }

  return {
    state: { ...state, invalidCount },
    outbound: [buildSendQuestion(def, step, { withInvalidPrefix: true })],
    completed: false,
  };
}
