import { SDR_SCORING } from "./config";
import type { ClassificationResult, SdrCategoria, SdrProximaAcao } from "./types";

/** Mapeia score numérico para categoria A-E usando os thresholds de config. */
export function scoreToCategoria(
  score: number,
  sinalDescarte: boolean,
): SdrCategoria {
  if (sinalDescarte || score < SDR_SCORING.thresholds.D) return "E";
  if (score < SDR_SCORING.thresholds.C) return "D";
  if (score < SDR_SCORING.thresholds.B) return "C";
  if (score < SDR_SCORING.thresholds.A) return "B";
  return "A";
}

/** Decide se deve acionar handoff com base na categoria e na config do corretor. */
export function shouldHandoff(
  categoria: SdrCategoria,
  handoffMinCategoria: string,
): boolean {
  const order: SdrCategoria[] = ["A", "B", "C", "D", "E"];
  return order.indexOf(categoria) <= order.indexOf(handoffMinCategoria as SdrCategoria);
}

/** Retorna a próxima ação recomendada com base na categoria. */
export function proximaAcao(
  categoria: SdrCategoria,
  handoff: boolean,
): SdrProximaAcao {
  if (handoff) return "notificar_corretor";
  if (categoria === "C") return "follow_up_agendado";
  if (categoria === "D") return "nutrir";
  return "arquivar"; // E
}

/** Valida e normaliza o resultado do classificador Gemini para garantir consistência. */
export function normalizeClassification(
  raw: ClassificationResult,
  handoffMinCategoria: string,
): ClassificationResult {
  const { thresholds, dimensions } = SDR_SCORING;

  // Clamp dimensões nos máximos configurados
  const dim = raw.dimensoes ?? ({} as ClassificationResult["dimensoes"]);
  const clamped = {
    intencao:          Math.min(dim.intencao ?? 0, dimensions.intencao.max),
    urgencia:          Math.min(dim.urgencia ?? 0, dimensions.urgencia.max),
    gatilho:           Math.min(dim.gatilho ?? 0, dimensions.gatilho.max),
    perfil_tamanho:    Math.min(dim.perfil_tamanho ?? 0, dimensions.perfil_tamanho.max),
    capacidade:        Math.min(dim.capacidade ?? 0, dimensions.capacidade.max),
    decisor:           Math.min(dim.decisor ?? 0, dimensions.decisor.max),
    engajamento_dados: Math.min(dim.engajamento_dados ?? 0, dimensions.engajamento_dados.max),
  };

  // Recalcula score como soma das dimensões (fonte da verdade)
  const score = Object.values(clamped).reduce((a, b) => a + b, 0);

  const sinalDescarte = raw.sinal_descarte ?? false;
  const categoria = scoreToCategoria(score, sinalDescarte);
  const handoff = shouldHandoff(categoria, handoffMinCategoria);
  const proxima = proximaAcao(categoria, handoff);

  return {
    ...raw,
    score,
    categoria,
    dimensoes: clamped,
    sinal_descarte: sinalDescarte,
    handoff,
    proxima_acao: proxima,
    dados_extraidos: raw.dados_extraidos ?? {
      nome: null,
      idade: null,
      cidade_estado: null,
      tipo: "indefinido",
      vidas: null,
      tem_plano_hoje: null,
      motivo_gatilho: null,
      prazo: null,
      decisor: null,
    },
    motivos: raw.motivos ?? [],
  };

  void thresholds; // referenciado indiretamente via scoreToCategoria
}
