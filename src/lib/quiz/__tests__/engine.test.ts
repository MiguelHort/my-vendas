import { beforeEach, describe, expect, it } from "vitest";
import { QUIZ_DEFINITION } from "../definition";
import { advance } from "../engine";
import type { QuizInboundEvent, QuizOutboundAction, QuizState } from "../types";

const NOW = new Date("2026-09-10T12:00:00.000Z");
const now = () => NOW;

function freshState(over: Partial<QuizState> = {}): QuizState {
  return {
    status: "EM_ANDAMENTO",
    currentStep: "q1",
    lastQuestionWamid: "wamid-q1", // q1 já foi enviada
    invalidCount: 0,
    answers: [],
    temPlanoAtual: null,
    necessidadePrincipal: null,
    completedAt: null,
    ...over,
  };
}

function click(id: string, contextId: string | null): QuizInboundEvent {
  return { kind: "button_reply", id, title: id, contextId };
}

/** Percorre o quiz clicando nos botões; simula o wamid da pergunta enviada. */
function walk(steps: string[]) {
  let state = freshState();
  const sends: QuizOutboundAction[] = [];
  let questionWamid = "wamid-q1";

  for (const optionId of steps) {
    const res = advance(state, click(optionId, questionWamid), { now });
    state = res.state;
    sends.push(...res.outbound);

    // o que o orquestrador faria após enviar com sucesso a próxima pergunta:
    if (state.status === "EM_ANDAMENTO" && state.currentStep) {
      questionWamid = `wamid-${state.currentStep}`;
      state = { ...state, lastQuestionWamid: questionWamid };
    }
  }

  return { state, sends };
}

describe("advance — caminhos completos", () => {
  it("caminho de troca de plano até a mensagem final", () => {
    const { state, sends } = walk([
      "q1_1_pessoa",
      "q2_sim",
      "q3_trocar",
      "q4_custos",
      "q5_tratamento",
    ]);

    expect(state.status).toBe("CONCLUIDO");
    expect(state.currentStep).toBeNull();
    expect(state.temPlanoAtual).toBe(true);
    expect(state.necessidadePrincipal).toBe("tratamento");
    expect(state.completedAt).toBe(NOW.toISOString());
    expect(state.answers.map((a) => a.optionId)).toEqual([
      "q1_1_pessoa",
      "q2_sim",
      "q3_trocar",
      "q4_custos",
      "q5_tratamento",
    ]);

    const finalAction = sends.at(-1);
    expect(finalAction).toEqual({ type: "send_text", body: QUIZ_DEFINITION.mensagemFinal });
    // perguntas enviadas ao longo do caminho: q2, q3, q4, q5
    expect(
      sends.filter((s) => s.type === "send_question").map((s) => (s.type === "send_question" ? s.step : ""))
    ).toEqual(["q2", "q3", "q4", "q5"]);
  });

  it("caminho de primeiro plano encerra logo após a q3, sem q4/q5", () => {
    const { state, sends } = walk(["q1_5_mais", "q2_nao", "q3_prevencao"]);

    expect(state.status).toBe("CONCLUIDO");
    expect(state.temPlanoAtual).toBe(false);
    expect(state.necessidadePrincipal).toBe("prevencao");
    expect(state.answers.map((a) => a.optionId)).toEqual(["q1_5_mais", "q2_nao", "q3_prevencao"]);

    const steps = sends
      .filter((s) => s.type === "send_question")
      .map((s) => (s.type === "send_question" ? s.step : ""));
    expect(steps).toEqual(["q2", "q3"]); // nunca q4 nem q5
    expect(sends.at(-1)).toEqual({ type: "send_text", body: QUIZ_DEFINITION.mensagemFinal });
  });
});

describe("advance — clique em botão antigo", () => {
  it("id de pergunta anterior não altera respostas e reenvia a pergunta atual", () => {
    const state = freshState({ currentStep: "q3", lastQuestionWamid: "wamid-q3", answers: [] });
    const res = advance(state, click("q1_1_pessoa", "wamid-q1"), { now });

    expect(res.state).toEqual(state); // nada mudou
    expect(res.completed).toBe(false);
    expect(res.outbound).toHaveLength(1);
    const action = res.outbound[0];
    expect(action.type).toBe("send_question");
    if (action.type === "send_question") {
      expect(action.step).toBe("q3");
      expect(action.body).toBe(QUIZ_DEFINITION.perguntas.q3.corpo); // sem prefixo de inválida
    }
  });

  it("id correto mas context.id diferente do último enviado também só reenvia", () => {
    const state = freshState({ currentStep: "q2", lastQuestionWamid: "wamid-q2-atual" });
    const res = advance(state, click("q2_sim", "wamid-q2-antigo"), { now });

    expect(res.state).toEqual(state);
    expect(res.state.answers).toHaveLength(0);
    expect(res.outbound[0].type).toBe("send_question");
  });
});

describe("advance — resposta inválida", () => {
  let state: QuizState;
  beforeEach(() => {
    state = freshState({ currentStep: "q2", lastQuestionWamid: "wamid-q2" });
  });

  it("texto livre incrementa o contador e reenvia com o aviso no início", () => {
    const res = advance(state, { kind: "other" }, { now });

    expect(res.state.invalidCount).toBe(1);
    expect(res.state.status).toBe("EM_ANDAMENTO");
    const action = res.outbound[0];
    expect(action.type).toBe("send_question");
    if (action.type === "send_question") {
      expect(action.body.startsWith(QUIZ_DEFINITION.mensagemRespostaInvalida)).toBe(true);
      expect(action.body).toContain(QUIZ_DEFINITION.perguntas.q2.corpo);
    }
  });

  it("ao atingir o limite, interrompe e não reenvia", () => {
    const s = { ...state, invalidCount: QUIZ_DEFINITION.maxRespostasInvalidasSeguidas - 1 };
    const res = advance(s, { kind: "other" }, { now });

    expect(res.state.invalidCount).toBe(QUIZ_DEFINITION.maxRespostasInvalidasSeguidas);
    expect(res.state.status).toBe("INTERROMPIDO");
    expect(res.state.currentStep).toBeNull();
    expect(res.outbound).toEqual([]);
  });

  it("uma resposta válida zera o contador de inválidas", () => {
    const withInvalids = freshState({ invalidCount: 2 });
    const res = advance(withInvalids, click("q1_1_pessoa", "wamid-q1"), { now });
    expect(res.state.invalidCount).toBe(0);
    expect(res.state.currentStep).toBe("q2");
  });
});

describe("advance — quiz terminado", () => {
  it("clique é ignorado quando o quiz já foi concluído", () => {
    const state = freshState({ status: "CONCLUIDO", currentStep: null, lastQuestionWamid: null });
    const res = advance(state, click("q1_1_pessoa", "x"), { now });
    expect(res).toEqual({ state, outbound: [], completed: false });
  });

  it("clique é ignorado quando o quiz foi interrompido", () => {
    const state = freshState({ status: "INTERROMPIDO", currentStep: null, lastQuestionWamid: null });
    const res = advance(state, { kind: "other" }, { now });
    expect(res.outbound).toEqual([]);
  });
});

describe("advance — pergunta ainda não entregue (primeiro contato / envio falhou)", () => {
  it("qualquer mensagem só (re)envia a pergunta atual, sem contador nem resposta", () => {
    const state = freshState({ currentStep: "q1", lastQuestionWamid: null, invalidCount: 0 });

    const asText = advance(state, { kind: "other" }, { now });
    expect(asText.state).toEqual(state); // invalidCount continua 0
    expect(asText.outbound[0]).toMatchObject({ type: "send_question", step: "q1" });

    const asClick = advance(state, click("q1_1_pessoa", "qualquer"), { now });
    expect(asClick.state).toEqual(state);
    expect(asClick.state.answers).toHaveLength(0);
    expect(asClick.outbound[0]).toMatchObject({ type: "send_question", step: "q1" });
  });
});
