import { describe, expect, it, vi } from "vitest";
import { runQuizForInbound, type QuizDeps, type QuizInboundMessage } from "../orchestrator";
import type { QuizSendResult, QuizSender } from "../send";
import type { LockedCtx, OutboundRecord, QuizStore, StoredQuiz } from "../store";
import type { QuizOutboundAction } from "../types";

const WA_ID = "5547999998888";

function storedQuiz(over: Partial<StoredQuiz> = {}): StoredQuiz {
  return {
    status: "EM_ANDAMENTO",
    currentStep: "q1",
    lastQuestionWamid: "wamid-q1",
    lastInboundWamid: null,
    leadId: "lead-1",
    invalidCount: 0,
    answers: [],
    temPlanoAtual: null,
    necessidadePrincipal: null,
    completedAt: null,
    ...over,
  };
}

class FakeStore implements QuizStore {
  quiz: StoredQuiz | null;
  conversationId: string | null = "conv-1";
  outbound: OutboundRecord[] = [];
  lastQuestionWamidSet: string[] = [];

  constructor(quiz: StoredQuiz | null) {
    this.quiz = quiz;
  }

  async runLocked<T>(_waId: string, fn: (ctx: LockedCtx) => Promise<T>): Promise<T> {
    const ctx: LockedCtx = {
      conversationId: this.conversationId,
      quiz: this.quiz,
      save: async (patch) => {
        if (this.quiz) this.quiz = { ...this.quiz, ...patch };
      },
    };
    return fn(ctx);
  }

  async setLastQuestionWamid(_conversationId: string, wamid: string): Promise<void> {
    this.lastQuestionWamidSet.push(wamid);
    if (this.quiz) this.quiz.lastQuestionWamid = wamid;
  }

  async recordOutbound(_conversationId: string, rec: OutboundRecord): Promise<void> {
    this.outbound.push(rec);
  }
}

class FakeSender implements QuizSender {
  sent: { to: string; action: QuizOutboundAction }[] = [];
  queue: QuizSendResult[] = [];
  counter = 0;

  async send(to: string, action: QuizOutboundAction): Promise<QuizSendResult> {
    this.sent.push({ to, action });
    return this.queue.shift() ?? { ok: true, wamid: `sent-${++this.counter}` };
  }
}

function makeDeps(store: QuizStore, sender: QuizSender): QuizDeps & { onComplete: ReturnType<typeof vi.fn> } {
  const onComplete = vi.fn(async () => {});
  return {
    store,
    sender,
    onComplete,
    now: () => new Date("2026-09-10T12:00:00.000Z"),
    log: { error: () => {}, warn: () => {}, info: () => {} },
  };
}

function inbound(wamid: string, button?: { id: string; contextId: string }): QuizInboundMessage {
  return button
    ? { wamid, buttonReply: { id: button.id, title: button.id }, contextId: button.contextId }
    : { wamid, buttonReply: null, contextId: null };
}

describe("runQuizForInbound", () => {
  it("não faz nada se a conversa existe mas nunca teve quiz (contato antigo)", async () => {
    const store = new FakeStore(null);
    const sender = new FakeSender();
    const deps = makeDeps(store, sender);

    await runQuizForInbound({ waId: WA_ID, message: inbound("m1") }, deps);

    expect(sender.sent).toHaveLength(0);
    expect(deps.onComplete).not.toHaveBeenCalled();
  });

  it("não faz nada se o quiz já foi concluído", async () => {
    const store = new FakeStore(storedQuiz({ status: "CONCLUIDO", currentStep: null }));
    const sender = new FakeSender();
    const deps = makeDeps(store, sender);

    await runQuizForInbound(
      { waId: WA_ID, message: inbound("m1", { id: "q1_1_pessoa", contextId: "wamid-q1" }) },
      deps
    );

    expect(sender.sent).toHaveLength(0);
  });

  it("o mesmo webhook entregue duas vezes é processado uma única vez", async () => {
    const store = new FakeStore(storedQuiz());
    const sender = new FakeSender();
    const deps = makeDeps(store, sender);
    const msg = inbound("m1", { id: "q1_1_pessoa", contextId: "wamid-q1" });

    await runQuizForInbound({ waId: WA_ID, message: msg }, deps);
    await runQuizForInbound({ waId: WA_ID, message: msg }, deps);

    expect(sender.sent).toHaveLength(1); // só a q2 foi enviada, uma vez
    expect(store.quiz?.currentStep).toBe("q2");
    expect(store.quiz?.lastInboundWamid).toBe("m1");
    expect(store.quiz?.answers.map((a) => a.optionId)).toEqual(["q1_1_pessoa"]);
  });

  it("falha no envio da próxima pergunta não perde a resposta e permite reenvio depois", async () => {
    const store = new FakeStore(storedQuiz());
    const sender = new FakeSender();
    sender.queue = [{ ok: false, status: 500, metaCode: 131000, message: "boom" }];
    const deps = makeDeps(store, sender);

    await runQuizForInbound(
      { waId: WA_ID, message: inbound("m1", { id: "q1_1_pessoa", contextId: "wamid-q1" }) },
      deps
    );

    // avançou e guardou a resposta, mas a pergunta ficou pendente (sem wamid)
    expect(store.quiz?.currentStep).toBe("q2");
    expect(store.quiz?.answers.map((a) => a.optionId)).toEqual(["q1_1_pessoa"]);
    expect(store.quiz?.lastQuestionWamid).toBeNull();
    expect(store.lastQuestionWamidSet).toHaveLength(0);

    // próxima mensagem qualquer → reenvia a pergunta pendente (q2)
    await runQuizForInbound({ waId: WA_ID, message: inbound("m2") }, deps);

    expect(sender.sent).toHaveLength(2);
    const last = sender.sent.at(-1)!.action;
    expect(last).toMatchObject({ type: "send_question", step: "q2" });
    expect(store.quiz?.lastInboundWamid).toBe("m2");
  });

  it("ao concluir, envia a mensagem final e chama aoConcluirQuiz uma vez com os derivados", async () => {
    // começa já na q3 (troca de plano), q3 é a pergunta atual e foi enviada
    const store = new FakeStore(
      storedQuiz({
        currentStep: "q3",
        lastQuestionWamid: "wamid-q3",
        answers: [
          { step: "q1", optionId: "q1_1_pessoa", optionTitle: "Somente 1 pessoa", at: "x" },
          { step: "q2", optionId: "q2_sim", optionTitle: "Sim", at: "x" },
        ],
      })
    );
    const sender = new FakeSender();
    const deps = makeDeps(store, sender);

    // q3_trocar → q4
    await runQuizForInbound(
      { waId: WA_ID, message: inbound("m3", { id: "q3_trocar", contextId: "wamid-q3" }) },
      deps
    );
    // q4_custos → q5
    await runQuizForInbound(
      { waId: WA_ID, message: inbound("m4", { id: "q4_custos", contextId: "sent-1" }) },
      deps
    );
    // q5_tratamento → FIM
    await runQuizForInbound(
      { waId: WA_ID, message: inbound("m5", { id: "q5_tratamento", contextId: "sent-2" }) },
      deps
    );

    expect(store.quiz?.status).toBe("CONCLUIDO");
    const finalSend = sender.sent.at(-1)!.action;
    expect(finalSend.type).toBe("send_text");

    expect(deps.onComplete).toHaveBeenCalledTimes(1);
    expect(deps.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        temPlanoAtual: true,
        necessidadePrincipal: "tratamento",
        leadId: "lead-1",
      })
    );
  });
});
