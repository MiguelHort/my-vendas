import { aoConcluirQuiz } from "./on-complete";
import type { QuizDeps } from "./orchestrator";
import { realQuizSender } from "./send";
import { realQuizStore } from "./store";

/** Dependências reais do quiz (banco + Cloud API + CRM). Os testes injetam fakes. */
export const realQuizDeps: QuizDeps = {
  store: realQuizStore,
  sender: realQuizSender,
  onComplete: aoConcluirQuiz,
};
