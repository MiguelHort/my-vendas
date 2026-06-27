export type SdrCategoria = "A" | "B" | "C" | "D" | "E";
export type SlotStatus = "vazio" | "parcial" | "preenchido";
export type SdrProximaAcao = "perguntar" | "passar_corretor" | "nutrir" | "arquivar";

// ── Checklist slots ───────────────────────────────────────────────────────────

export interface SlotVidas {
  status: SlotStatus;
  quantidade: number | null;
  pessoas: Array<{ parentesco: string | null; idade: number | null }>;
  idades_faltando: number | null;
}

export interface SlotRegiao {
  status: SlotStatus;
  cidade: string | null;
  estado: string | null;
}

export interface SlotFinalidade {
  status: SlotStatus;
  tipo: "prevencao" | "tratamento" | null;
  condicao: string | null;
}

export interface SlotCnpj {
  status: SlotStatus;
  possui: boolean | null;
  finalidade: "familia" | "colaboradores" | null;
}

export interface SlotPlanoAtual {
  status: SlotStatus;
  possui: boolean | null;
  qual: string | null;
  tempo: string | null;
  motivo_troca: string | null;
}

export interface SlotAbrangencia {
  status: SlotStatus;
  preferencia: "nacional_completo" | "regional_economico" | "indiferente" | null;
}

export interface SlotRedePreferida {
  status: SlotStatus;
  possui: boolean | null;
  local: string | null;
}

export interface SdrChecklist {
  vidas: SlotVidas;
  regiao: SlotRegiao;
  finalidade: SlotFinalidade;
  cnpj: SlotCnpj;
  plano_atual: SlotPlanoAtual;
  abrangencia: SlotAbrangencia;
  rede_preferida: SlotRedePreferida;
}

// ── Placar v2 ─────────────────────────────────────────────────────────────────

export interface SdrPlacar {
  tamanho: number;
  localizacao: number;
  capacidade: number;
  qualidade: number;
  engajamento: number;
  prioridade: number;
  total: number;
}

// ── Flags ─────────────────────────────────────────────────────────────────────

export interface SdrFlags {
  regiao_sem_oferta: boolean;
  risco_saude: boolean;
  alerta_adverso: boolean;
  info_incompleta: boolean;
  pediu_humano: boolean;
  insiste_preco: boolean;
}

// ── Resultado completo do classificador ──────────────────────────────────────

export interface ClassificationResult {
  checklist: SdrChecklist;
  nucleo_completo: boolean;
  placar: SdrPlacar;
  flags: SdrFlags;
  categoria: SdrCategoria;
  proxima_acao: SdrProximaAcao;
  proxima_pergunta_alvo: string | null;
  resumo_para_corretor: string | null;
}

// ── Mensagem recebida via webhook Zavu ────────────────────────────────────────

export interface IncomingMessage {
  /** Zavu senderId — identifica qual número/corretor recebeu a mensagem */
  senderId: string;
  /** Número de telefone do lead em formato E.164 */
  from: string;
  body: string;
  messageId: string;
  timestamp: number;
  /** Presente quando a mensagem original era um áudio */
  audioUrl?: string;
  audioMime?: string;
}
