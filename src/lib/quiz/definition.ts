import { FIM, type NecessidadePrincipal, type QuizDefinition } from "./types";
import { validateQuizDefinition } from "./validate";

/**
 * Definição do quiz de qualificação — orientada a dados.
 * Edite textos e ramificações AQUI; o motor (`engine.ts`) não conhece nenhuma
 * pergunta específica, só percorre este grafo.
 *
 * Os títulos de botão já respeitam o limite de 20 caracteres da Meta.
 * NÃO altere os textos sem alinhar com o produto.
 */
export const QUIZ_DEFINITION: QuizDefinition = {
  primeiraPergunta: "q1",

  perguntas: {
    q1: {
      corpo: [
        "Olá! 👋 Para te indicar os melhores planos de saúde, vou fazer algumas perguntas rápidas.",
        "",
        "*Para quantas pessoas seria o plano?*",
      ].join("\n"),
      opcoes: [
        { id: "q1_1_pessoa", titulo: "Somente 1 pessoa", proxima: "q2" },
        { id: "q1_2_a_4", titulo: "2 a 4 pessoas", proxima: "q2" },
        { id: "q1_5_mais", titulo: "5 ou mais pessoas", proxima: "q2" },
      ],
    },

    q2: {
      corpo: "*Você possui CNPJ?*",
      opcoes: [
        { id: "q2_sim", titulo: "Sim", proxima: "q3" },
        { id: "q2_nao", titulo: "Não", proxima: "q3" },
      ],
    },

    q3: {
      corpo: [
        "*Qual o motivo da procura por um plano de saúde hoje?*",
        "",
        "Se este for seu primeiro plano, escolha entre _Segurança/prevenção_ e _Tratar uma condição_.",
      ].join("\n"),
      opcoes: [
        { id: "q3_trocar", titulo: "Trocar plano atual", proxima: "q4" },
        { id: "q3_prevencao", titulo: "Segurança/prevenção", proxima: FIM },
        { id: "q3_tratamento", titulo: "Tratar uma condição", proxima: FIM },
      ],
    },

    // só aparece para quem escolheu q3_trocar
    q4: {
      corpo: "*Por que você gostaria de ver um novo plano?*",
      opcoes: [
        { id: "q4_atendimento", titulo: "Melhorar atendimento", proxima: "q5" },
        { id: "q4_custos", titulo: "Reduzir custos", proxima: "q5" },
      ],
    },

    // só aparece para quem escolheu q3_trocar
    q5: {
      corpo: "*Qual sua principal necessidade com o novo plano?*",
      opcoes: [
        { id: "q5_prevencao", titulo: "Segurança/prevenção", proxima: FIM },
        { id: "q5_tratamento", titulo: "Tratar uma condição", proxima: FIM },
      ],
    },
  },

  // texto provisório
  mensagemFinal: [
    "Perfeito, obrigado pelas respostas! ✅",
    "Um especialista vai analisar seu perfil e te enviar as melhores opções de plano em breve.",
  ].join("\n"),

  mensagemRespostaInvalida: "Para continuar, toque em uma das opções abaixo 👇",

  maxRespostasInvalidasSeguidas: 3,
};

/**
 * Regras dos campos derivados, calculados ao concluir o quiz.
 * Mantidas aqui (e não no motor) pra também serem editáveis por dados.
 */
export const DERIVACAO: {
  temPlanoAtual: { step: string; quandoOptionId: string };
  necessidade: Record<NecessidadePrincipal, string[]>;
} = {
  temPlanoAtual: { step: "q3", quandoOptionId: "q3_trocar" },
  necessidade: {
    prevencao: ["q3_prevencao", "q5_prevencao"],
    tratamento: ["q3_tratamento", "q5_tratamento"],
  },
};

/**
 * Mapa da opção da q1 para número de vidas gravado no lead em `aoConcluirQuiz`.
 * Não faz parte do fluxo do quiz — só da ligação com o CRM.
 */
export const Q1_QTD_VIDAS: Record<string, number> = {
  q1_1_pessoa: 1,
  q1_2_a_4: 4,
  q1_5_mais: 5,
};

// Checagem na inicialização: se a definição violar os limites da Meta ou o grafo
// ficar inconsistente, o app não sobe.
validateQuizDefinition(QUIZ_DEFINITION);
