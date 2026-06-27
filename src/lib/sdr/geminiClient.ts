import { GoogleGenAI } from "@google/genai";
import { GEMINI_COST_PER_TOKEN } from "./config";
import type { ClassificationResult } from "./types";

function client() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");
  return new GoogleGenAI({ apiKey: key });
}

function model() {
  return process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
}

export interface GeminiCallResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
}

type MessageRole = "user" | "model";
interface HistoryEntry {
  role: MessageRole;
  parts: [{ text: string }];
}

export async function sdrReply(
  systemPrompt: string,
  history: HistoryEntry[],
  newUserMessage: string,
): Promise<GeminiCallResult> {
  const ai = client();

  const chat = ai.chats.create({
    model: model(),
    config: { systemInstruction: systemPrompt },
    history,
  });

  const response = await chat.sendMessage({ message: newUserMessage });

  const text = response.text ?? "";
  const tokensIn = response.usageMetadata?.promptTokenCount ?? 0;
  const tokensOut = response.usageMetadata?.candidatesTokenCount ?? 0;
  const costEstimate =
    tokensIn * GEMINI_COST_PER_TOKEN.input +
    tokensOut * GEMINI_COST_PER_TOKEN.output;

  return { text, tokensIn, tokensOut, costEstimate };
}

export async function classifyConversation(
  conversationText: string,
): Promise<{ result: ClassificationResult; tokensIn: number; tokensOut: number; costEstimate: number }> {
  const ai = client();

  const prompt = `Você é um classificador de leads de plano de saúde. Analise a conversa abaixo e retorne APENAS o JSON especificado, sem texto fora dele e sem cercas de código.

JSON esperado:
{
  "categoria": "A | B | C | D | E",
  "score": 0,
  "dimensoes": {
    "intencao": 0,
    "urgencia": 0,
    "gatilho": 0,
    "perfil_tamanho": 0,
    "capacidade": 0,
    "decisor": 0,
    "engajamento_dados": 0
  },
  "sinal_descarte": false,
  "dados_extraidos": {
    "nome": null,
    "idade": null,
    "cidade_estado": null,
    "tipo": "individual | familiar | empresarial | indefinido",
    "vidas": null,
    "tem_plano_hoje": null,
    "motivo_gatilho": null,
    "prazo": null,
    "decisor": null
  },
  "motivos": ["frase curta explicando a classificação"],
  "handoff": false,
  "proxima_acao": "notificar_corretor | follow_up_agendado | nutrir | arquivar"
}

Rubrica de pontuação por dimensão:
- intencao (max 25): explícita=25, interessado/comparando=15, só curiosidade=5, evasivo=0
- urgencia (max 20): imediata=20, esse mês=14, 1-3 meses=7, sem prazo=2
- gatilho (max 15): evento forte (gravidez, demissão, perda de plano, cirurgia)=15, genérico=7, nenhum=0
- perfil_tamanho (max 15): PME/familiar grande=15, familiar pequeno=10, individual=6, indefinido=2
- capacidade (max 10): sinaliza poder pagar=10, incerto=5, só quer o mais barato=0
- decisor (max 5): é o decisor=5, depende de alguém=3, não é decisor=1
- engajamento_dados (max 10): responde completo e deu dados=10, parcial=5, evasivo=2, parou=0

Categoria:
- A: score>=75 E intenção explícita E urgência imediata/curta E é decisor
- B: score 55-74
- C: score 35-54
- D: score 15-34
- E: score<15 OU sinal_descarte=true

sinal_descarte=true se: ofensivo, spam, bot, fora de área, menor desacompanhado, dados falsos, pediu só preço e sumiu.

CONVERSA:
${conversationText}`;

  const response = await ai.models.generateContent({
    model: model(),
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const raw = response.text ?? "{}";
  const tokensIn = response.usageMetadata?.promptTokenCount ?? 0;
  const tokensOut = response.usageMetadata?.candidatesTokenCount ?? 0;
  const costEstimate =
    tokensIn * GEMINI_COST_PER_TOKEN.input +
    tokensOut * GEMINI_COST_PER_TOKEN.output;

  // Remove cercas de código ```json ... ``` se vierem
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let result: ClassificationResult;
  try {
    result = JSON.parse(cleaned) as ClassificationResult;
  } catch {
    throw new Error(`Classificador retornou JSON inválido: ${cleaned.slice(0, 200)}`);
  }

  return { result, tokensIn, tokensOut, costEstimate };
}

export async function transcribeAudio(
  audioUrl: string,
  mimeType: string = "audio/ogg",
): Promise<GeminiCallResult> {
  const ai = client();

  const audioResp = await fetch(audioUrl);
  if (!audioResp.ok) throw new Error(`Falha ao baixar áudio: ${audioResp.status}`);
  const buffer = await audioResp.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  // Remove parâmetros de codec (ex: "audio/ogg; codecs=opus" → "audio/ogg")
  const normalizedMime = mimeType.split(";")[0].trim() || "audio/ogg";

  const result = await ai.models.generateContent({
    model: model(),
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: normalizedMime, data: base64 } },
        { text: "Transcreva este áudio em português. Retorne APENAS o texto transcrito, sem explicações ou formatação adicional." },
      ],
    }],
  });

  const text = (result.text ?? "").trim();
  const tokensIn = result.usageMetadata?.promptTokenCount ?? 0;
  const tokensOut = result.usageMetadata?.candidatesTokenCount ?? 0;
  const costEstimate =
    tokensIn * GEMINI_COST_PER_TOKEN.input +
    tokensOut * GEMINI_COST_PER_TOKEN.output;

  return { text, tokensIn, tokensOut, costEstimate };
}

export function buildHistoryFromMessages(
  messages: { role: string; content: string }[],
): HistoryEntry[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as MessageRole) : ("user" as MessageRole),
    parts: [{ text: m.content }],
  }));
}

export function buildConversationText(
  messages: { role: string; content: string }[],
): string {
  return messages
    .map((m) => {
      const speaker = m.role === "assistant" ? "ASSISTENTE" : "LEAD";
      return `${speaker}: ${m.content}`;
    })
    .join("\n");
}
