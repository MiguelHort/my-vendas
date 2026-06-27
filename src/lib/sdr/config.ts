// Todas as constantes do SDR ficam aqui — ajustáveis sem tocar na lógica.

export const SDR_SCORING = {
  dimensions: {
    tamanho:     { max: 25 },
    localizacao: { max: 20 },
    capacidade:  { max: 15 },
    qualidade:   { max: 15 },
    engajamento: { max: 15 },
    prioridade:  { max: 10 },
  },

  // Limiares inferiores (inclusivos) para cada categoria
  thresholds: {
    A: 70,
    B: 50,
    C: 35,
    D: 15,
    // abaixo de D → E
  },

  // A partir de qual categoria o SDR aciona handoff (sobrescrito pelo sdr_config do corretor)
  defaultHandoffMinCategoria: "B" as "A" | "B" | "C" | "D" | "E",

  // Após N follow-ups sem resposta → categoria E
  defaultFollowupMaxTentativas: 3,
} as const;

// Custo estimado por token (USD) — Gemini 2.5 Flash
export const GEMINI_COST_PER_TOKEN = {
  input:  0.000_000_075,
  output: 0.000_000_300,
} as const;

export const SDR_LEAD_ORIGEM = "WhatsApp SDR";
export const SDR_LEAD_STATUS_INICIAL = "SDR";
