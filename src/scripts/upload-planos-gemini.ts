// scripts/upload-planos-gemini.ts
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no ambiente.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const baseDir = path.join(process.cwd(), "planos-pdf");

  if (!fs.existsSync(baseDir)) {
    console.error("Pasta planos-pdf não encontrada:", baseDir);
    process.exit(1);
  }

  const pdfFiles = fs.readdirSync(baseDir).filter((f) => f.endsWith(".pdf"));

  if (pdfFiles.length === 0) {
    console.error("Nenhum PDF encontrado em planos-pdf/");
    process.exit(1);
  }

  console.log("Encontrados PDFs:", pdfFiles);
  console.log("Enviando para o Gemini...");

  const results: { fileName: string; uri: string; mimeType: string }[] = [];

  for (const fileName of pdfFiles) {
    const fullPath = path.join(baseDir, fileName);

    console.log(`\nSubindo: ${fileName}`);

    // 1) upload
    const uploaded = await ai.files.upload({
      file: fullPath,
      config: { displayName: fileName },
    });

    // ⚠️ alguns tipos da lib marcam name como string | undefined
    const uploadedName = uploaded.name;
    if (!uploadedName) {
      console.error("Arquivo enviado mas sem 'name' retornado pelo Gemini:", uploaded);
      continue; // ou dar throw, se preferir
    }

    // 2) esperar processamento
    let info = await ai.files.get({ name: uploadedName });

    while (info.state === "PROCESSING") {
      console.log(
        `- Arquivo ainda processando (${info.name ?? uploadedName}), aguardando 3s...`
      );
      await new Promise((r) => setTimeout(r, 3000));
      info = await ai.files.get({ name: uploadedName });
    }

    if (info.state !== "ACTIVE") {
      console.warn(
        `! Arquivo ${fileName} ficou em estado ${info.state}, pulando`
      );
      continue;
    }

    console.log(
      `OK: ${fileName} => uri: ${info.uri} mimeType: ${info.mimeType}`
    );

    if (!info.uri || !info.mimeType) {
      console.warn(
        `! Arquivo ${fileName} está ACTIVE mas sem uri/mimeType definidos, pulando`
      );
      continue;
    }

    results.push({
      fileName,
      uri: info.uri,
      mimeType: info.mimeType,
    });
  }

  console.log("\n=== Cole isso na sua .env em GEMINI_PLANOS_FILE_URIS ===");
  console.log(results.map((r) => r.uri).join(","));

  console.log("\nDetalhado (caso queira salvar em outro lugar):");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
