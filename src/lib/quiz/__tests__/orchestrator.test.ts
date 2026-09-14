import { describe, expect, it, vi } from "vitest";
import { runQuizForInbound, type QuizDeps, type QuizInboundMessage } from "../orchestrator";
import type { QuizSendResult, QuizSender } from "../send";
import type { LockedCtx, OutboundRecord, QuizStore, StoredQuiz } from "../store";
import type { QuizOutboundAction } from "../types";

const WA_ID = "5547999998888";

function storedQuiz(over: Partial<StoredQuiz> = {}): StoredQuiz {
  return {
    status: "EM_ANDAMENTO",
    currentStep: "motivo",
    lastQuestionWamid: "wamid-motivo",
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

function inboundText(wamid: string, body: string): QuizInboundMessage {
  return { wamid, buttonReply: null, contextId: null, text: body };
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
      { waId: WA_ID, message: inbound("m1", { id: "motivo_trocar", contextId: "wamid-motivo" }) },
      deps
    );

    expect(sender.sent).toHaveLength(0);
  });

  it("o mesmo webhook entregue duas vezes é processado uma única vez", async () => {
    const store = new FakeStore(storedQuiz());
    const sender = new FakeSender();
    const deps = makeDeps(store, sender);
    const msg = inbound("m1", { id: "motivo_seguranca", contextId: "wamid-motivo" });

    await runQuizForInbound({ waId: WA_ID, message: msg }, deps);
    await runQuizForInbound({ waId: WA_ID, message: msg }, deps);

    expect(sender.sent).toHaveLength(1); // só a "pessoas" foi enviada, uma vez (pula "atendimento")
    expect(store.quiz?.currentStep).toBe("pessoas");
    expect(store.quiz?.lastInboundWamid).toBe("m1");
    expect(store.quiz?.answers.map((a) => a.optionId)).toEqual(["motivo_seguranca"]);

    // a pergunta enviada é registrada no inbox com os botões, pra exibição
    const record = store.outbound.at(-1)!;
    expect(record.type).toBe("interactive");
    expect(record.buttons?.map((b) => b.id)).toEqual(["pessoas_1", "pessoas_2_4", "pessoas_5_mais"]);
  });

  it("falha no envio da próxima pergunta não perde a resposta e permite reenvio depois", async () => {
    const store = new FakeStore(storedQuiz());
    const sender = new FakeSender();
    sender.queue = [{ ok: false, status: 500, metaCode: 131000, message: "boom" }];
    const deps = makeDeps(store, sender);

    await runQuizForInbound(
      { waId: WA_ID, message: inbound("m1", { id: "motivo_seguranca", contextId: "wamid-motivo" }) },
      deps
    );

    // avançou e guardou a resposta, mas a pergunta ficou pendente (sem wamid)
    expect(store.quiz?.currentStep).toBe("pessoas");
    expect(store.quiz?.answers.map((a) => a.optionId)).toEqual(["motivo_seguranca"]);
    expect(store.quiz?.lastQuestionWamid).toBeNull();
    expect(store.lastQuestionWamidSet).toHaveLength(0);

    // próxima mensagem qualquer → reenvia a pergunta pendente ("pessoas")
    await runQuizForInbound({ waId: WA_ID, message: inbound("m2") }, deps);

    expect(sender.sent).toHaveLength(2);
    const last = sender.sent.at(-1)!.action;
    expect(last).toMatchObject({ type: "send_question", step: "pessoas" });
    expect(store.quiz?.lastInboundWamid).toBe("m2");
  });

  it("resposta em texto livre (cidade) é registrada como mensagem de texto simples, sem botões", async () => {
    const store = new FakeStore(
      storedQuiz({
        currentStep: "cidade",
        lastQuestionWamid: "wamid-cidade",
        answers: [
          { step: "motivo", optionId: "motivo_seguranca", optionTitle: "Segurança/prevenção", at: "x" },
          { step: "pessoas", optionId: "pessoas_1", optionTitle: "Somente 1", at: "x" },
          { step: "cobertura", optionId: "cobertura_regional", optionTitle: "Conta/regional", at: "x" },
        ],
      })
    );
    const sender = new FakeSender();
    const deps = makeDeps(store, sender);

    await runQuizForInbound({ waId: WA_ID, message: inboundText("m1", "Joinville") }, deps);

    expect(store.quiz?.status).toBe("CONCLUIDO");
    expect(store.quiz?.answers.at(-1)).toMatchObject({ step: "cidade", optionId: null, optionTitle: "Joinville" });

    const record = store.outbound.at(-1)!;
    expect(record.type).toBe("text"); // mensagem final, texto simples
    expect(deps.onComplete).toHaveBeenCalledTimes(1);
  });

  it("ao concluir pelo caminho de troca de plano, envia a mensagem final e chama aoConcluirQuiz com os derivados", async () => {
    // começa já na "motivo", primeira pergunta do quiz
    const store = new FakeStore(storedQuiz());
    const sender = new FakeSender();
    const deps = makeDeps(store, sender);

    // motivo_trocar → atendimento
    await runQuizForInbound(
      { waId: WA_ID, message: inbound("m1", { id: "motivo_trocar", contextId: "wamid-motivo" }) },
      deps
    );
    // atendimento_conta → pessoas
    await runQuizForInbound(
      { waId: WA_ID, message: inbound("m2", { id: "atendimento_conta", contextId: "sent-1" }) },
      deps
    );
    // pessoas_5_mais → cobertura
    await runQuizForInbound(
      { waId: WA_ID, message: inbound("m3", { id: "pessoas_5_mais", contextId: "sent-2" }) },
      deps
    );
    // cobertura_nacional → cidade
    await runQuizForInbound(
      { waId: WA_ID, message: inbound("m4", { id: "cobertura_nacional", contextId: "sent-3" }) },
      deps
    );
    // texto livre → FIM
    await runQuizForInbound({ waId: WA_ID, message: inboundText("m5", "São Paulo") }, deps);

    expect(store.quiz?.status).toBe("CONCLUIDO");
    const finalSend = sender.sent.at(-1)!.action;
    expect(finalSend.type).toBe("send_text");

    expect(deps.onComplete).toHaveBeenCalledTimes(1);
    expect(deps.onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        temPlanoAtual: true,
        necessidadePrincipal: null,
        leadId: "lead-1",
      })
    );
  });
});
