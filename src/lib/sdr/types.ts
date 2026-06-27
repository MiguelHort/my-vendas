export type SdrCategoria = "A" | "B" | "C" | "D" | "E";

export type SdrProximaAcao =
  | "notificar_corretor"
  | "follow_up_agendado"
  | "nutrir"
  | "arquivar";

export interface SdrDimensoes {
  intencao: number;
  urgencia: number;
  gatilho: number;
  perfil_tamanho: number;
  capacidade: number;
  decisor: number;
  engajamento_dados: number;
}

export interface SdrDadosExtraidos {
  nome: string | null;
  idade: string | null;
  cidade_estado: string | null;
  tipo: "individual" | "familiar" | "empresarial" | "indefinido";
  vidas: number | null;
  tem_plano_hoje: boolean | null;
  motivo_gatilho: string | null;
  prazo: string | null;
  decisor: boolean | null;
}

export interface ClassificationResult {
  categoria: SdrCategoria;
  score: number;
  dimensoes: SdrDimensoes;
  sinal_descarte: boolean;
  dados_extraidos: SdrDadosExtraidos;
  motivos: string[];
  handoff: boolean;
  proxima_acao: SdrProximaAcao;
}

export interface IncomingMessage {
  /** Zavu senderId — identifica qual número/corretor recebeu a mensagem */
  senderId: string;
  /** Número de telefone do lead em formato E.164 (ex: "+5547999990000") */
  from: string;
  body: string;
  messageId: string;
  timestamp: number;
  /** Presente quando a mensagem original era um áudio */
  audioUrl?: string;
  audioMime?: string;
}
