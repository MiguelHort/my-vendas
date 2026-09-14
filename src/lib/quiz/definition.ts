import { FIM, type NecessidadePrincipal, type QuizDefinition } from "./types";
import { validateQuizDefinition } from "./validate";

/**
 * Definição do quiz de qualificação — orientada a dados.
 * Edite textos e ramificações AQUI; o motor (`engine.ts`) não conhece nenhuma
 * pergunta específica, só percorre este grafo.
 *
 * Os títulos de botão respeitam o limite de 20 caracteres da Meta — quando o texto
 * pedido não coube, o título do botão foi abreviado (comentado em cada opção);
 * o corpo da mensagem em si não foi alterado.
 * NÃO altere os textos sem alinhar com o produto.
 */
export const QUIZ_DEFINITION: QuizDefinition = {
  primeiraPergunta: "motivo",

  mensagemAbertura: [
    "Opa! Fico feliz que tenha interesse em planos de saúde",
    "",
    "Para direcionar o atendimento, vou precisar de algumas informações 👇🏼",
  ].join("\n"),

  perguntas: {
    motivo: {
      corpo: "Por qual motivo estaria procurando um novo plano de saúde?",
      opcoes: [
        { id: "motivo_trocar", titulo: "Trocar plano atual", proxima: "atendimento" },
        // "Segurança e prevenção" (21 caracteres) não cabe no limite de botão (20) — abreviado.
        { id: "motivo_seguranca", titulo: "Segurança/prevenção", proxima: "pessoas" },
        // "Tratar alguma situação de saúde" (31) não cabe — abreviado.
        { id: "motivo_tratar", titulo: "Tratar situação", proxima: "pessoas" },
      ],
    },

    // só aparece pra quem escolheu "Trocar plano atual"
    atendimento: {
      corpo: "Certo! Para um novo plano te atender melhor, a sua preferência seria:",
      opcoes: [
        // "Melhor atendimento/rede maior" (29) não cabe — abreviado.
        { id: "atendimento_melhor", titulo: "Melhor atendimento", proxima: "pessoas" },
        { id: "atendimento_conta", titulo: "Plano mais em conta", proxima: "pessoas" },
      ],
    },

    pessoas: {
      corpo: "Perfeito, para quantas pessoas gostaria de ver um plano?",
      opcoes: [
        { id: "pessoas_1", titulo: "Somente 1", proxima: "cnpj" },
        { id: "pessoas_2_4", titulo: "2 a 4 pessoas", proxima: "cnpj" },
        { id: "pessoas_5_mais", titulo: "5 ou mais pessoas", proxima: "cnpj" },
      ],
    },

    cnpj: {
      corpo: "Você possui CNPJ?",
      opcoes: [
        { id: "cnpj_sim", titulo: "Sim", proxima: "cobertura" },
        { id: "cnpj_nao", titulo: "Não", proxima: "cobertura" },
      ],
    },

    cobertura: {
      corpo: "Sobre a cobertura, a sua preferência seria:",
      opcoes: [
        // "Plano mais em conta e regional" (30) não cabe — abreviado.
        { id: "cobertura_regional", titulo: "Em Conta/regional", proxima: "cidade" },
        // "Plano mais completo e nacional" (30) não cabe — abreviado.
        { id: "cobertura_nacional", titulo: "Completo/nacional", proxima: "cidade" },
      ],
    },

    // pergunta de texto livre — sem botões, a resposta é o que o contato escrever.
    cidade: {
      corpo: "Para finalizar, escreve aqui em qual cidade você gostaria de cobertura 👇🏼",
      opcoes: [],
      proximaSeTexto: FIM,
    },
  },

  // texto provisório
  mensagemFinal: [
    "Perfeito, obrigado pelas respostas! ✅",
    "Um especialista vai analisar seu perfil e te enviar as melhores opções de plano em breve.",
  ].join("\n"),

  mensagemRespostaInvalida: "Para continuar, toque em uma das opções abaixo 👇",
  mensagemRespostaInvalidaTexto: "Não consegui entender 🙏 Pode escrever só o nome da cidade?",

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
  temPlanoAtual: { step: "motivo", quandoOptionId: "motivo_trocar" },
  necessidade: {
    prevencao: ["motivo_seguranca"],
    tratamento: ["motivo_tratar"],
  },
};

/**
 * Mapa da opção de "pessoas" pra número de vidas gravado no lead em `aoConcluirQuiz`.
 * Não faz parte do fluxo do quiz — só da ligação com o CRM.
 */
export const PESSOAS_QTD_VIDAS: Record<string, number> = {
  pessoas_1: 1,
  pessoas_2_4: 4,
  pessoas_5_mais: 5,
};

/** Rótulo legível de `necessidadePrincipal`, usado em qualquer exibição (UI, Will). */
export const NECESSIDADE_PRINCIPAL_LABEL: Record<NecessidadePrincipal, string> = {
  prevencao: "Segurança/prevenção",
  tratamento: "Tratar uma condição",
};

/**
 * Rótulo curto de uma pergunta pra exibição (modal de respostas do contato).
 * Usa o primeiro trecho em *negrito* do corpo; se não houver, a 1ª linha.
 */
export function rotuloPergunta(step: string): string {
  const corpo = QUIZ_DEFINITION.perguntas[step]?.corpo;
  if (!corpo) return step;
  const bold = corpo.match(/\*([^*]+)\*/);
  if (bold) return bold[1].trim();
  return corpo.split("\n")[0]?.trim() || step;
}

// Checagem na inicialização: se a definição violar os limites da Meta ou o grafo
// ficar inconsistente, o app não sobe.
validateQuizDefinition(QUIZ_DEFINITION);
