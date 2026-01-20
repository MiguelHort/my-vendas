// lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY não configurada.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// 🔒 por enquanto vou FIXAR o modelo aqui
const MODEL_ID = "gemini-2.0-flash";

export type TipoPlano = "individual" | "familiar" | "pme";
export type Acomodacao = "enfermaria" | "apartamento";
export type Coparticipacao = "com" | "sem";

export type FaixasEtarias = Record<string, number>;

export type CotacaoPlanoSaudeInput = {
  nome: string;
  cidade: string;
  estado: string;
  tipoPlano: TipoPlano;
  acomodacao: Acomodacao;
  coparticipacao: Coparticipacao;
  observacoes?: string;
  faixasEtarias: FaixasEtarias;
};

export type PlanoSaude = {
  operadora: string;
  nomePlano: string;
  acomodacao: string;
  coparticipacao: string;
  faixaEtaria: string;
  preco: number;
  observacoes?: string;
};

export type CotacaoPlanoSaudeResult = {
  planos: PlanoSaude[];
  observacoesGerais?: string;
};

const SYSTEM_PROMPT = `
Você é um Corretor de Planos de Saúde Sênior.
Use EXCLUSIVAMENTE os PDFs anexados como fonte de verdade (tabelas, preços, condições).
Nunca invente valores nem complete lacunas.
Se uma informação não estiver no PDF, não inclua planos com valores inventados.
Para limitações gerais, explique em "observacoesGerais".
Se o estado ou cidade informado não for atendido por nenhum plano, retorne uma lista vazia e essa mensagem "Não existe produto para essa região" na chave "observacoesGerais".

Você receberá dados de faixas etárias, por exemplo:
{
  "0-18": 2,
  "19-23": 1,
  "24-28": 0,
  ...
}

Cada chave é uma faixa etária e o valor é a quantidade de vidas naquela faixa.

RESPONDA SEMPRE em JSON válido, sem nenhum outro texto, seguindo EXATAMENTE este formato:

{
  "planos": [
    {
      "operadora": "string",
      "nomePlano": "string",
      "acomodacao": "Enfermaria ou Apartamento ou Ambulatorial ou Todos",
      "coparticipacao": "Com ou Sem ou Ambos",
      "faixaEtaria": "string",
      "preco": number,
      "observacoes": "string opcional"
    }
  ],
  "observacoesGerais": "string opcional"
}
`.trim();

function buildUserPrompt(input: CotacaoPlanoSaudeInput): string {
  const faixasFormatadas = Object.entries(input.faixasEtarias)
    .filter(([, qtd]) => (qtd || 0) > 0)
    .map(([faixa, qtd]) => `- Faixa ${faixa}: ${qtd} vidas`)
    .join("\n");

  return `
Quero uma cotação de plano de saúde com base APENAS nos PDFs anexados.

Dados do cliente:
- Nome: ${input.nome}
- Cidade/UF: ${input.cidade} - ${input.estado}

Dados do plano desejado:
- Tipo de plano: ${input.tipoPlano}
- Acomodação: ${input.acomodacao}
- Coparticipação: ${input.coparticipacao}

Distribuição de faixas etárias:
${faixasFormatadas || "- Nenhuma faixa informada (isso não deve acontecer, valide no backend)."}

${input.observacoes ? `Observações extras: ${input.observacoes}` : ""}

Lembre-se:
- Use apenas dados dos PDFs.
- Não invente valores.
- Responda apenas com JSON, no formato especificado no system prompt.
`.trim();
}

export async function gerarCotacaoPlanoSaude(
  input: CotacaoPlanoSaudeInput
): Promise<CotacaoPlanoSaudeResult> {
  const model = genAI.getGenerativeModel({ model: MODEL_ID });

  const rawUris = process.env.GEMINI_PLANOS_FILE_URIS ?? "";
  const fileUris = rawUris
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log("🔗 PDFs usados na cotação:", fileUris);

  const parts: any[] = [];

  // 1) system prompt
  parts.push({ text: SYSTEM_PROMPT });

  // 2) PDFs (fileData)
  for (const uri of fileUris) {
    parts.push({
      fileData: {
        fileUri: uri,
        mimeType: "application/pdf",
      },
    });
  }

  // 3) prompt da cotação
  parts.push({ text: buildUserPrompt(input) });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const text = result.response.text();
  console.log("🧾 Resposta bruta da IA (cotação):", text);

  try {
    const json = JSON.parse(text);

    const planos: PlanoSaude[] = Array.isArray(json.planos)
      ? json.planos.map((p: any) => ({
          operadora: String(p.operadora ?? ""),
          nomePlano: String(p.nomePlano ?? ""),
          acomodacao: String(p.acomodacao ?? ""),
          coparticipacao: String(p.coparticipacao ?? ""),
          faixaEtaria: String(p.faixaEtaria ?? ""),
          preco: Number(p.preco ?? 0),
          observacoes: p.observacoes ? String(p.observacoes) : undefined,
        }))
      : [];

    return {
      planos,
      observacoesGerais: json.observacoesGerais
        ? String(json.observacoesGerais)
        : undefined,
    };
  } catch (err) {
    console.error("❌ Falha ao fazer parse do JSON da cotação:", err);
    throw new Error("Resposta inválida da IA ao gerar cotação");
  }
}
