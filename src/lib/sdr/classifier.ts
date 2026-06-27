import { SDR_SCORING } from "./config";
import type { ClassificationResult, SdrCategoria, SdrFlags, SdrPlacar, SdrProximaAcao } from "./types";

/** Mapeia score + flags para categoria A-E. Ordem de avaliação conforme spec v2. */
export function scoreToCategoria(total: number, flags: SdrFlags): SdrCategoria {
  if (flags.regiao_sem_oferta) return "E";
  if (total < SDR_SCORING.thresholds.D) return "E";
  if (total < SDR_SCORING.thresholds.C) return "D";
  if (flags.alerta_adverso) return "C"; // teto máximo quando há sinalização de seleção adversa
  if (total < SDR_SCORING.thresholds.B) return "C";
  if (total < SDR_SCORING.thresholds.A) return "B";
  return "A";
}

/** Decide se deve acionar handoff com base na categoria e na config do corretor. */
export function shouldHandoff(categoria: SdrCategoria, handoffMinCategoria: string): boolean {
  const order: SdrCategoria[] = ["A", "B", "C", "D", "E"];
  return order.indexOf(categoria) <= order.indexOf(handoffMinCategoria as SdrCategoria);
}

/** Determina a próxima ação a partir de categoria, flags e completude do núcleo. */
function calcProximaAcao(
  categoria: SdrCategoria,
  flags: SdrFlags,
  nucleoCompleto: boolean,
  handoffMinCategoria: string,
): SdrProximaAcao {
  if (flags.pediu_humano || flags.insiste_preco) return "passar_corretor";
  if (nucleoCompleto && shouldHandoff(categoria, handoffMinCategoria)) return "passar_corretor";
  if (!nucleoCompleto || flags.info_incompleta) return "perguntar";
  if (categoria === "D") return "nutrir";
  if (categoria === "E") return "arquivar";
  return "perguntar";
}

/** Valida e normaliza o JSON retornado pelo Gemini, recalculando score e categoria. */
export function normalizeClassification(
  raw: ClassificationResult,
  handoffMinCategoria: string,
): ClassificationResult {
  const { dimensions } = SDR_SCORING;

  // Clamp placar
  const p = raw.placar ?? ({} as SdrPlacar);
  const clamped: SdrPlacar = {
    tamanho:     Math.min(p.tamanho     ?? 0, dimensions.tamanho.max),
    localizacao: Math.min(p.localizacao ?? 0, dimensions.localizacao.max),
    capacidade:  Math.min(p.capacidade  ?? 0, dimensions.capacidade.max),
    qualidade:   Math.min(p.qualidade   ?? 0, dimensions.qualidade.max),
    engajamento: Math.min(p.engajamento ?? 0, dimensions.engajamento.max),
    prioridade:  Math.min(p.prioridade  ?? 0, dimensions.prioridade.max),
    total: 0,
  };
  clamped.total = (clamped.tamanho + clamped.localizacao + clamped.capacidade +
                   clamped.qualidade + clamped.engajamento + clamped.prioridade);

  const flags: SdrFlags = {
    regiao_sem_oferta: raw.flags?.regiao_sem_oferta ?? false,
    risco_saude:       raw.flags?.risco_saude       ?? false,
    alerta_adverso:    raw.flags?.alerta_adverso    ?? false,
    info_incompleta:   raw.flags?.info_incompleta   ?? true,
    pediu_humano:      raw.flags?.pediu_humano      ?? false,
    insiste_preco:     raw.flags?.insiste_preco     ?? false,
  };

  const nucleoCompleto = raw.nucleo_completo ?? false;
  const categoria = scoreToCategoria(clamped.total, flags);
  const proximaAcao = calcProximaAcao(categoria, flags, nucleoCompleto, handoffMinCategoria);

  return {
    checklist: raw.checklist,
    nucleo_completo: nucleoCompleto,
    placar: clamped,
    flags,
    categoria,
    proxima_acao: proximaAcao,
    proxima_pergunta_alvo: raw.proxima_pergunta_alvo ?? null,
    resumo_para_corretor: raw.resumo_para_corretor ?? null,
  };
}
