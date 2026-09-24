import { beforeEach, describe, expect, it } from "vitest";
import { QUIZ_DEFINITION } from "../definition";
import { advance } from "../engine";
import type { QuizInboundEvent, QuizOutboundAction, QuizState } from "../types";

const NOW = new Date("2026-09-10T12:00:00.000Z");
const now = () => NOW;

function freshState(over: Partial<QuizState> = {}): QuizState {
  return {
    status: "EM_ANDAMENTO",
    currentStep: "canal",
    lastQuestionWamid: "wamid-canal", // "canal" (1ª pergunta) já foi enviada
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

function text(body: string): QuizInboundEvent {
  return { kind: "text", body };
}

/** Percorre o quiz respondendo (clique ou texto); simula o wamid da pergunta enviada. */
function walk(steps: QuizInboundEvent[]) {
  let state = freshState();
  const sends: QuizOutboundAction[] = [];
  let questionWamid = "wamid-canal";

  for (const event of steps) {
    const evt: QuizInboundEvent =
      event.kind === "button_reply" ? { ...event, contextId: questionWamid } : event;
    const res = advance(state, evt, { now });
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
  it("caminho de troca de plano (com sub-pergunta de atendimento) até a mensagem final", () => {
    const { state, sends } = walk([
      click("canal_mensagem", null),
      click("motivo_trocar", null),
      click("atendimento_melhor", null),
      click("pessoas_2_4", null),
      text("34, 30"),
      click("cnpj_sim", null),
      click("cobertura_nacional", null),
      text("  Florianópolis  "),
    ]);

    expect(state.status).toBe("CONCLUIDO");
    expect(state.currentStep).toBeNull();
    expect(state.temPlanoAtual).toBe(true); // motivo_trocar
    expect(state.necessidadePrincipal).toBeNull(); // eixo não coletado nesse caminho
    expect(state.completedAt).toBe(NOW.toISOString());
    expect(state.answers).toEqual([
      { step: "canal", optionId: "canal_mensagem", optionTitle: "Mensagem", at: NOW.toISOString() },
      { step: "motivo", optionId: "motivo_trocar", optionTitle: "Trocar plano atual", at: NOW.toISOString() },
      { step: "atendimento", optionId: "atendimento_melhor", optionTitle: "Melhor atendimento", at: NOW.toISOString() },
      { step: "pessoas", optionId: "pessoas_2_4", optionTitle: "2 a 4 pessoas", at: NOW.toISOString() },
      { step: "idades", optionId: null, optionTitle: "34, 30", at: NOW.toISOString() },
      { step: "cnpj", optionId: "cnpj_sim", optionTitle: "Sim", at: NOW.toISOString() },
      { step: "cobertura", optionId: "cobertura_nacional", optionTitle: "Completo/nacional", at: NOW.toISOString() },
      { step: "cidade", optionId: null, optionTitle: "Florianópolis", at: NOW.toISOString() },
    ]);

    const finalAction = sends.at(-1);
    expect(finalAction).toEqual({ type: "send_text", body: QUIZ_DEFINITION.mensagemFinal });
    // perguntas enviadas ao longo do caminho: motivo, atendimento, pessoas, idades, cnpj, cobertura, cidade
    expect(
      sends.filter((s) => s.type === "send_question").map((s) => (s.type === "send_question" ? s.step : ""))
    ).toEqual(["motivo", "atendimento", "pessoas", "idades", "cnpj", "cobertura", "cidade"]);
  });

  it("caminho sem troca de plano pula a sub-pergunta de atendimento", () => {
    const { state, sends } = walk([
      click("canal_ligacao", null),
      click("motivo_seguranca", null),
      click("pessoas_1", null),
      text("29"),
      click("cnpj_nao", null),
      click("cobertura_regional", null),
      text("Curitiba"),
    ]);

    expect(state.status).toBe("CONCLUIDO");
    expect(state.temPlanoAtual).toBe(false);
    expect(state.necessidadePrincipal).toBe("prevencao");
    expect(state.answers.map((a) => a.optionId)).toEqual([
      "canal_ligacao",
      "motivo_seguranca",
      "pessoas_1",
      null,
      "cnpj_nao",
      "cobertura_regional",
      null,
    ]);
    expect(state.answers.at(-1)?.optionTitle).toBe("Curitiba");

    const steps = sends
      .filter((s) => s.type === "send_question")
      .map((s) => (s.type === "send_question" ? s.step : ""));
    expect(steps).toEqual(["motivo", "pessoas", "idades", "cnpj", "cobertura", "cidade"]); // nunca "atendimento"
    expect(sends.at(-1)).toEqual({ type: "send_text", body: QUIZ_DEFINITION.mensagemFinal });
  });

  it("motivo 'tratar situação' deriva necessidade = tratamento", () => {
    const { state } = walk([
      click("canal_mensagem", null),
      click("motivo_tratar", null),
      click("pessoas_5_mais", null),
      text("40, 38, 10, 8, 5"),
      click("cnpj_sim", null),
      click("cobertura_nacional", null),
      text("Curitiba"),
    ]);
    expect(state.temPlanoAtual).toBe(false);
    expect(state.necessidadePrincipal).toBe("tratamento");
  });
});

describe("advance — pergunta de texto livre (cidade)", () => {
  function stateAtCidade(over: Partial<QuizState> = {}): QuizState {
    return freshState({ currentStep: "cidade", lastQuestionWamid: "wamid-cidade", ...over });
  }

  it("texto não vazio é aceito como resposta e conclui o quiz", () => {
    const res = advance(stateAtCidade(), text("  Belo Horizonte  "), { now });
    expect(res.completed).toBe(true);
    expect(res.state.status).toBe("CONCLUIDO");
    expect(res.state.answers.at(-1)).toEqual({
      step: "cidade",
      optionId: null,
      optionTitle: "Belo Horizonte", // trim aplicado
      at: NOW.toISOString(),
    });
  });

  it("texto vazio (só espaços) conta como resposta inválida, não conclui", () => {
    const res = advance(stateAtCidade(), text("   "), { now });
    expect(res.completed).toBe(false);
    expect(res.state.invalidCount).toBe(1);
    expect(res.state.answers).toHaveLength(0);
    const action = res.outbound[0];
    expect(action.type).toBe("send_question");
    if (action.type === "send_question") {
      expect(action.body.startsWith(QUIZ_DEFINITION.mensagemRespostaInvalidaTexto)).toBe(true);
      expect(action.buttons).toEqual([]);
    }
  });

  it("clique em botão (não faz sentido numa pergunta de texto livre) conta como inválida", () => {
    const res = advance(stateAtCidade(), click("qualquer_id", "wamid-cidade"), { now });
    expect(res.state.invalidCount).toBe(1);
    expect(res.state.answers).toHaveLength(0);
    const action = res.outbound[0];
    expect(action.type).toBe("send_question");
    if (action.type === "send_question") {
      expect(action.body.startsWith(QUIZ_DEFINITION.mensagemRespostaInvalidaTexto)).toBe(true);
    }
  });

  it("a pergunta de texto livre é enviada sem botões", () => {
    const res = advance(freshState({ currentStep: "cobertura", lastQuestionWamid: "wamid-cobertura" }), click("cobertura_regional", "wamid-cobertura"), { now });
    const action = res.outbound[0];
    expect(action.type).toBe("send_question");
    if (action.type === "send_question") {
      expect(action.step).toBe("cidade");
      expect(action.buttons).toEqual([]);
    }
  });
});

describe("advance — clique em botão antigo", () => {
  it("id de pergunta anterior não altera respostas e reenvia a pergunta atual", () => {
    const state = freshState({ currentStep: "cobertura", lastQuestionWamid: "wamid-cobertura", answers: [] });
    const res = advance(state, click("motivo_trocar", "wamid-motivo"), { now });

    expect(res.state).toEqual(state); // nada mudou
    expect(res.completed).toBe(false);
    expect(res.outbound).toHaveLength(1);
    const action = res.outbound[0];
    expect(action.type).toBe("send_question");
    if (action.type === "send_question") {
      expect(action.step).toBe("cobertura");
      expect(action.body).toBe(QUIZ_DEFINITION.perguntas.cobertura.corpo); // sem prefixo de inválida
    }
  });

  it("id correto mas context.id diferente do último enviado também só reenvia", () => {
    const state = freshState({ currentStep: "pessoas", lastQuestionWamid: "wamid-pessoas-atual" });
    const res = advance(state, click("pessoas_1", "wamid-pessoas-antigo"), { now });

    expect(res.state).toEqual(state);
    expect(res.state.answers).toHaveLength(0);
    expect(res.outbound[0].type).toBe("send_question");
  });
});

describe("advance — resposta inválida (pergunta com botões)", () => {
  let state: QuizState;
  beforeEach(() => {
    state = freshState({ currentStep: "pessoas", lastQuestionWamid: "wamid-pessoas" });
  });

  it("texto numa pergunta de botão incrementa o contador e reenvia com o aviso no início", () => {
    const res = advance(state, text("oi"), { now });

    expect(res.state.invalidCount).toBe(1);
    expect(res.state.status).toBe("EM_ANDAMENTO");
    const action = res.outbound[0];
    expect(action.type).toBe("send_question");
    if (action.type === "send_question") {
      expect(action.body.startsWith(QUIZ_DEFINITION.mensagemRespostaInvalida)).toBe(true);
      expect(action.body).toContain(QUIZ_DEFINITION.perguntas.pessoas.corpo);
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
    const res = advance(withInvalids, click("canal_mensagem", "wamid-canal"), { now });
    expect(res.state.invalidCount).toBe(0);
    expect(res.state.currentStep).toBe("motivo");
  });
});

describe("advance — quiz terminado", () => {
  it("clique é ignorado quando o quiz já foi concluído", () => {
    const state = freshState({ status: "CONCLUIDO", currentStep: null, lastQuestionWamid: null });
    const res = advance(state, click("motivo_trocar", "x"), { now });
    expect(res).toEqual({ state, outbound: [], completed: false });
  });

  it("clique é ignorado quando o quiz foi interrompido", () => {
    const state = freshState({ status: "INTERROMPIDO", currentStep: null, lastQuestionWamid: null });
    const res = advance(state, { kind: "other" }, { now });
    expect(res.outbound).toEqual([]);
  });
});

describe("advance — pergunta ainda não entregue (primeiro contato / envio falhou)", () => {
  it("no primeiríssimo turno, manda a mensagem de abertura + a 1ª pergunta, sem contador nem resposta", () => {
    const state = freshState({ currentStep: "canal", lastQuestionWamid: null, invalidCount: 0, answers: [] });

    const res = advance(state, { kind: "other" }, { now });
    expect(res.state).toEqual(state); // nada mudou
    expect(res.outbound).toEqual([
      { type: "send_text", body: QUIZ_DEFINITION.mensagemAbertura },
      {
        type: "send_question",
        step: "canal",
        body: QUIZ_DEFINITION.perguntas.canal.corpo,
        buttons: QUIZ_DEFINITION.perguntas.canal.opcoes.map((o) => ({ id: o.id, title: o.titulo })),
      },
    ]);
  });

  it("reenvio de uma pergunta que não é a primeira não repete a mensagem de abertura", () => {
    const state = freshState({
      currentStep: "pessoas",
      lastQuestionWamid: null,
      answers: [
        { step: "canal", optionId: "canal_mensagem", optionTitle: "Mensagem", at: NOW.toISOString() },
        { step: "motivo", optionId: "motivo_seguranca", optionTitle: "Segurança/prevenção", at: NOW.toISOString() },
      ],
    });

    const res = advance(state, { kind: "other" }, { now });
    expect(res.state).toEqual(state);
    expect(res.outbound).toHaveLength(1);
    expect(res.outbound[0]).toMatchObject({ type: "send_question", step: "pessoas" });
  });

  it("clique em botão também só (re)envia — não processa a resposta", () => {
    const state = freshState({ currentStep: "motivo", lastQuestionWamid: null, answers: [] });
    const res = advance(state, click("motivo_trocar", "qualquer"), { now });
    expect(res.state.answers).toHaveLength(0);
    expect(res.outbound.at(-1)).toMatchObject({ type: "send_question", step: "motivo" });
  });
});
