import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const NO_SPEECH_MARKER = "(sem fala identificável)";

/**
 * O Google aposenta modelos do Gemini com frequência (o gemini-2.0-flash e o 2.5-flash-lite já
 * saíram do ar). `gemini-flash-latest` é um alias que ele mesmo atualiza; o resto é reserva.
 */
const MODELOS_RESERVA = ["gemini-flash-latest", "gemini-2.5-flash"];
const RODADAS = 2;
const PAUSA_ENTRE_RODADAS_MS = 3000;

/** Modelos a tentar, em ordem: o configurado em GEMINI_MODEL (se houver) e depois os de reserva. */
export function candidatosDeModelo(configurado = process.env.GEMINI_MODEL): string[] {
  const lista = [configurado?.trim(), ...MODELOS_RESERVA].filter((m): m is string => Boolean(m));
  return [...new Set(lista)];
}

/**
 * Vale tentar o próximo modelo quando este foi aposentado (404), está sobrecarregado (503),
 * com cota estourada (429) ou falhou no servidor deles (500). Erro de chave/entrada não.
 */
export function deveTentarOutroModelo(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  if (typeof status === "number") return [404, 429, 500, 503].includes(status);
  return /\[(404|429|500|503) /.test(err instanceof Error ? err.message : String(err));
}

function normalizeMimeForGemini(mimeType: string) {
  // Gemini não aceita o parâmetro de codec (ex: "audio/ogg;codecs=opus")
  return mimeType.split(";")[0].trim();
}

export async function transcribeAudio(buffer: Buffer, mimeType: string) {
  const partes = [
    {
      inlineData: {
        mimeType: normalizeMimeForGemini(mimeType),
        data: buffer.toString("base64"),
      },
    },
    `Transcreva o áudio a seguir em português do Brasil.
Devolva só o texto transcrito, sem comentários, sem aspas, sem prefixos como "Transcrição:".
Se o áudio não tiver fala compreensível (ex: só ruído, música, silêncio), responda exatamente: ${NO_SPEECH_MARKER}`,
  ];

  // Duas rodadas: a sobrecarga (503) do Gemini costuma passar em poucos segundos.
  let ultimoErro: unknown;
  for (let rodada = 0; rodada < RODADAS; rodada++) {
    if (rodada > 0) await new Promise((r) => setTimeout(r, PAUSA_ENTRE_RODADAS_MS));
    for (const nome of candidatosDeModelo()) {
      try {
        const result = await genAI.getGenerativeModel({ model: nome }).generateContent(partes);
        const text = result.response.text().trim();
        return text || NO_SPEECH_MARKER;
      } catch (err) {
        ultimoErro = err;
        console.warn(
          `[transcricao] modelo ${nome} falhou:`,
          err instanceof Error ? err.message.slice(0, 200) : err
        );
        if (!deveTentarOutroModelo(err)) throw err;
      }
    }
  }
  throw ultimoErro;
}
