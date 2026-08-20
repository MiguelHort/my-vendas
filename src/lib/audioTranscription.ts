import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const NO_SPEECH_MARKER = "(sem fala identificável)";

function normalizeMimeForGemini(mimeType: string) {
  // Gemini não aceita o parâmetro de codec (ex: "audio/ogg;codecs=opus")
  return mimeType.split(";")[0].trim();
}

export async function transcribeAudio(buffer: Buffer, mimeType: string) {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: normalizeMimeForGemini(mimeType),
        data: buffer.toString("base64"),
      },
    },
    `Transcreva o áudio a seguir em português do Brasil.
Devolva só o texto transcrito, sem comentários, sem aspas, sem prefixos como "Transcrição:".
Se o áudio não tiver fala compreensível (ex: só ruído, música, silêncio), responda exatamente: ${NO_SPEECH_MARKER}`,
  ]);

  const text = result.response.text().trim();
  return text || NO_SPEECH_MARKER;
}
