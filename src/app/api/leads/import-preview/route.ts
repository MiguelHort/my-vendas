import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const OPERADORAS_VALIDAS = [
  "Amil", "Bradesco Saúde", "Hapvida", "LevMed", "Nossa Saúde",
  "SulAmérica", "Unimed", "Select", "Notre Dame", "Clinipam",
];

const PROMPT_SISTEMA = `
Você é um assistente especializado em extrair dados de planilhas de vendas de planos de saúde.
Analise os dados da planilha e extraia informações de cada lead/cliente vendido.

Retorne um JSON array. Cada objeto deve ter exatamente estes campos:
- nome: string (nome do cliente, obrigatório)
- telefone: string ou null (formato: "(99) 99999-9999")
- origem: um de ["Lead Novo", "Retrabalho", "Ligação", "Indicação", "Presencial"] ou null (tente inferir do contexto, padrão null)
- estado: código UF de 2 letras em maiúsculas ou null (ex: "SP", "RJ")
- cidade: string ou null
- qtd_vidas: inteiro (número de vidas/beneficiários, padrão 1 se não encontrado)
- idades: string ou null (idades separadas por vírgula, ex: "34, 30, 5")
- data_venda: string no formato "YYYY-MM-DD" ou null (data de fechamento da venda)
- valor_mensalidade: número decimal ou null (valor mensal do plano em reais)
- valor_comissao: número decimal ou null (valor da comissão recebida em reais)
- operadora_ofertada: um de ${JSON.stringify(OPERADORAS_VALIDAS)} ou null
- modalidade: um de ["PF", "Adesão", "Empresarial", "PME"] ou null
- tipo_comissao: "interno" ou "externo" (padrão "interno")

Regras:
- Tente mapear os nomes das colunas da planilha para os campos acima de forma inteligente
- Se uma coluna tiver nome como "comissão", "comissao", "commission" → valor_comissao
- Se uma coluna tiver "mensalidade", "mensalidade mensal", "valor plano" → valor_mensalidade
- Datas em formatos diferentes (dd/mm/yyyy, mm/dd/yyyy) devem ser convertidas para YYYY-MM-DD
- Valores monetários podem vir com "R$", vírgulas ou pontos — extraia apenas o número
- NÃO inclua linhas de cabeçalho ou totais como leads
- Retorne APENAS o JSON array, sem markdown, sem explicações
`.trim();

function sheetToCSV(buffer: Buffer, ext: string): string {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    dateNF: "yyyy-mm-dd",
  });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (ext === "csv") {
    return XLSX.utils.sheet_to_csv(sheet);
  }
  // xlsx: convert to CSV for Gemini consumption
  return XLSX.utils.sheet_to_csv(sheet);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY não configurada" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["xlsx", "csv"].includes(ext)) {
    return NextResponse.json(
      { error: "Formato inválido. Envie .xlsx ou .csv" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const csvText = sheetToCSV(buffer, ext);

  if (!csvText.trim()) {
    return NextResponse.json({ error: "Planilha vazia" }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT_SISTEMA },
          { text: `\n\nDados da planilha:\n\n${csvText}` },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  });

  const raw = result.response.text();

  let leads: unknown[];
  try {
    const parsed = JSON.parse(raw);
    leads = Array.isArray(parsed) ? parsed : parsed.leads ?? [];
  } catch {
    console.error("Resposta bruta do Gemini:", raw);
    return NextResponse.json(
      { error: "Erro ao interpretar resposta da IA" },
      { status: 500 }
    );
  }

  return NextResponse.json({ leads });
}
