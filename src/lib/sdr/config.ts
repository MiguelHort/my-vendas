// Todas as constantes do SDR ficam aqui — ajustáveis sem tocar na lógica.

export const SDR_SCORING = {
  dimensions: {
    intencao:          { max: 25 },
    urgencia:          { max: 20 },
    gatilho:           { max: 15 },
    perfil_tamanho:    { max: 15 },
    capacidade:        { max: 10 },
    decisor:           { max: 5  },
    engajamento_dados: { max: 10 },
  },

  // Mapeamento score → categoria (limiar inferior inclusivo)
  thresholds: {
    A: 75,
    B: 55,
    C: 35,
    D: 15,
    // abaixo de D → E
  },

  // A partir de qual categoria o SDR aciona handoff imediato
  // (pode ser sobrescrito pelo sdr_config.handoff_min_categoria do corretor)
  defaultHandoffMinCategoria: "B" as "A" | "B" | "C" | "D" | "E",

  // Após N follow-ups sem resposta → categoria E
  defaultFollowupMaxTentativas: 3,
} as const;

// Custo estimado por token (USD) — Gemini 2.0 Flash pricing aproximado
export const GEMINI_COST_PER_TOKEN = {
  input:  0.000_000_075,  // $0.075 / 1M tokens
  output: 0.000_000_300,  // $0.30  / 1M tokens
} as const;

export const SDR_LEAD_ORIGEM = "WhatsApp SDR";
export const SDR_LEAD_STATUS_INICIAL = "Abordagem";
