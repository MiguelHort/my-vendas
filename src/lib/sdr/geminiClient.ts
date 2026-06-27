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

  const prompt = `Você é o motor de triagem de um SDR de planos de saúde. Analise a conversa e retorne APENAS o JSON abaixo, sem texto fora dele e sem cercas de código.

JSON esperado:
{
  "checklist": {
    "vidas": {"status": "vazio", "quantidade": null, "pessoas": [], "idades_faltando": null},
    "regiao": {"status": "vazio", "cidade": null, "estado": null},
    "finalidade": {"status": "vazio", "tipo": null, "condicao": null},
    "cnpj": {"status": "vazio", "possui": null, "finalidade": null},
    "plano_atual": {"status": "vazio", "possui": null, "qual": null, "tempo": null, "motivo_troca": null},
    "abrangencia": {"status": "vazio", "preferencia": null},
    "rede_preferida": {"status": "vazio", "possui": null, "local": null}
  },
  "nucleo_completo": false,
  "placar": {"tamanho": 0, "localizacao": 0, "capacidade": 0, "qualidade": 0, "engajamento": 0, "prioridade": 0, "total": 0},
  "flags": {"regiao_sem_oferta": false, "risco_saude": false, "alerta_adverso": false, "info_incompleta": true, "pediu_humano": false, "insiste_preco": false},
  "categoria": "C",
  "proxima_acao": "perguntar",
  "proxima_pergunta_alvo": null,
  "resumo_para_corretor": null
}

REGRAS DO CHECKLIST:
- status: "vazio"=sem info, "parcial"=incompleto, "preenchido"=completo
- VIDAS preenchido SOMENTE quando quantidade E TODAS as idades individuais são conhecidas. idades_faltando = pessoas sem idade (0 quando preenchido).
- NÚCLEO MÍNIMO para nucleo_completo=true: vidas(preenchido) + regiao(preenchido) + finalidade(preenchido). Exceção: pediu_humano ou insiste_preco → nucleo_completo=true.

PLACAR (total 100):
- tamanho (max 25): 1 vida=8, 2–3 vidas=16, 4+ vidas=22; CNPJ=+3 (teto 25)
- localizacao (max 20): capital/grande centro=20, cidade média=12, interior=5, sem oferta=0 → regiao_sem_oferta=true
- capacidade (max 15): prefere nacional/completo=15, indiferente=8, prefere regional/econômico=5, não informado=8
- qualidade (max 15): prevenção/saudável=15, não informado=8, condição preexistente=4 → risco_saude=true
- engajamento (max 15): responde completo e cordial=15, parcial=8, evasivo=3, parou=0
- prioridade (max 10): fluido/minutos=10, horas=6, demora=2, sumiu=0

CATEGORIA (avaliar nesta ordem):
1. regiao_sem_oferta=true → E
2. total < 15 → E
3. total 15–34 → D
4. total 35–49 → C; se alerta_adverso, máximo C mesmo com score maior
5. total 50–69 → B
6. total ≥ 70 e sem alerta_adverso → A

FLAGS:
- risco_saude: busca plano para tratar condição preexistente (DLP)
- alerta_adverso: pressa para fechar + condição recém-descoberta + quer cobrir já (seleção adversa)
- info_incompleta: true se nucleo_completo=false
- pediu_humano: pediu falar com humano/corretor
- insiste_preco: perguntou valor/preço mais de uma vez

proxima_acao:
- "perguntar": núcleo incompleto e lead ainda engajado
- "passar_corretor": nucleo_completo=true OU pediu_humano OU insiste_preco
- "nutrir": D sem engajamento
- "arquivar": E

proxima_pergunta_alvo: slot de maior prioridade com status vazio/parcial (vidas > regiao > finalidade > cnpj > plano_atual > abrangencia > rede_preferida). Se vidas está parcial por idades faltando, use "vidas_idades". Null se nucleo_completo=true.

resumo_para_corretor: resumo em 3–5 linhas para o corretor (nome se coletado, vidas+idades, região, finalidade/saúde, plano atual, preferência, flags relevantes). Preencher APENAS quando proxima_acao="passar_corretor". Null caso contrário.

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
