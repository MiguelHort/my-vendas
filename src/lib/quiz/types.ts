/**
 * Tipos do quiz de qualificação (primeiro contato pelo WhatsApp).
 *
 * O quiz é orientado a dados: a definição (`definition.ts`) descreve as perguntas
 * e as ramificações; o motor (`engine.ts`) só percorre esse grafo, sem `if/else`
 * por pergunta. Editar textos/ramos = editar `definition.ts`.
 */

/** Passo terminal do grafo. */
export const FIM = "FIM" as const;

export type QuizOption = {
  /** id do botão (<=256 chars), único no quiz. Ex: "motivo_trocar". */
  id: string;
  /** título do botão (<=20 chars), único dentro da pergunta. */
  titulo: string;
  /** id da próxima pergunta, ou "FIM". */
  proxima: string;
};

export type QuizQuestion = {
  /** corpo da mensagem (<=1024 chars). */
  corpo: string;
  /** 1 a 3 opções — mensagem `interactive`/`button`. Vazio = pergunta de texto livre. */
  opcoes: QuizOption[];
  /**
   * Só usado quando `opcoes` é vazio (pergunta de texto livre, ex: cidade):
   * id da próxima pergunta (ou "FIM") depois de qualquer resposta em texto.
   */
  proximaSeTexto?: string;
};

export type QuizDefinition = {
  primeiraPergunta: string;
  perguntas: Record<string, QuizQuestion>;
  /** mensagem de abertura, enviada uma única vez antes da 1ª pergunta. */
  mensagemAbertura: string;
  mensagemFinal: string;
  /** aviso de resposta inválida pra pergunta com botões. */
  mensagemRespostaInvalida: string;
  /** aviso de resposta inválida pra pergunta de texto livre (sem botão pra "tocar"). */
  mensagemRespostaInvalidaTexto: string;
  maxRespostasInvalidasSeguidas: number;
};

/** Status persistido do quiz de um contato. */
export type QuizStatus = "EM_ANDAMENTO" | "CONCLUIDO" | "INTERROMPIDO";

export type QuizAnswer = {
  step: string;
  /** null quando a resposta foi em texto livre (pergunta sem botões). */
  optionId: string | null;
  /** título do botão escolhido, ou o texto digitado, quando a pergunta é de texto livre. */
  optionTitle: string;
  /** ISO string */
  at: string;
};

export type NecessidadePrincipal = "prevencao" | "tratamento";

/** Estado do quiz que o motor recebe e devolve (subconjunto puro do registro). */
export type QuizState = {
  status: QuizStatus;
  /** pergunta atual; null quando concluído/interrompido. */
  currentStep: string | null;
  /** wamid da última pergunta enviada; null se ainda não enviada / envio falhou. */
  lastQuestionWamid: string | null;
  invalidCount: number;
  answers: QuizAnswer[];
  temPlanoAtual: boolean | null;
  necessidadePrincipal: NecessidadePrincipal | null;
  completedAt: string | null;
};

/** Evento de entrada normalizado a partir da mensagem do webhook. */
export type QuizInboundEvent =
  | {
      kind: "button_reply";
      /** interactive.button_reply.id */
      id: string;
      /** interactive.button_reply.title */
      title: string;
      /** context.id — wamid da mensagem que continha o botão (pode faltar). */
      contextId: string | null;
    }
  | {
      /** mensagem de texto — só é uma resposta válida numa pergunta de texto livre. */
      kind: "text";
      body: string;
    }
  | {
      /** áudio, imagem, figurinha, localização… qualquer coisa que não é botão nem texto. */
      kind: "other";
    };

/** Ação de saída que o motor pede; o orquestrador é quem executa o envio. */
export type QuizOutboundAction =
  | {
      type: "send_question";
      step: string;
      /** corpo já montado (com prefixo de resposta inválida quando for o caso). */
      body: string;
      buttons: { id: string; title: string }[];
    }
  | {
      type: "send_text";
      body: string;
    };

/** Resultado puro do motor. */
export type QuizAdvanceResult = {
  state: QuizState;
  outbound: QuizOutboundAction[];
  /** true exatamente na transição para CONCLUIDO. */
  completed: boolean;
};
