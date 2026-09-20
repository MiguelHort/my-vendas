import type { ResultadoCotacao } from "@/lib/px/cotacao";
import { brl, linhasDaProposta } from "./comum";

/**
 * Desenha o cartão da proposta num canvas e devolve um PNG (pra enviar no WhatsApp, copiar ou
 * baixar). Feito à mão em vez de capturar o HTML: sai igual em qualquer navegador/tema e não
 * precisa de biblioteca. Mantém o mesmo conteúdo do `PropostaCotacao` (via `linhasDaProposta`).
 */

const LARGURA = 640;
const ESCALA = 2; // 1280px de largura: nítido no celular do cliente
const PAD = 24;
const FONTE = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

const AZUL_LINHA = "#c3cff6";
const CINZA_TOTAL = "#e5e5e5";

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Escreve o texto reduzindo a fonte até caber em `maxW` (mínimo 9px). */
function textoAjustado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  maxW: number,
  px: number,
  peso: "normal" | "bold"
) {
  let tam = px;
  ctx.font = `${peso} ${tam}px ${FONTE}`;
  while (ctx.measureText(texto).width > maxW && tam > 9) {
    tam -= 0.5;
    ctx.font = `${peso} ${tam}px ${FONTE}`;
  }
  ctx.fillText(texto, x, y, maxW);
}

export async function gerarImagemProposta(p: {
  opcao: ResultadoCotacao;
  cliente: string | null;
  corretor: string | null;
  email: string | null;
  geradoEm: Date;
}): Promise<Blob> {
  const linhas = linhasDaProposta(p.opcao);
  const info: [string, string][] = [];
  if (p.cliente) info.push(["Cliente:", p.cliente]);
  if (p.corretor) info.push(["Corretor:", p.corretor]);
  if (p.email) info.push(["E-mail:", p.email]);

  const ALT_LINHA = 30;
  const ALT_TOTAL = 38;
  const alturaCabecalho = 56;
  const alturaInfo = info.length * 22;
  const alturaData = 40;
  const alturaTabela = linhas.length * ALT_LINHA + ALT_TOTAL;
  const alturaRodape = 38;
  const altura = PAD + alturaCabecalho + 14 + alturaInfo + alturaData + alturaTabela + alturaRodape + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = LARGURA * ESCALA;
  canvas.height = altura * ESCALA;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível criar a imagem neste navegador");
  ctx.scale(ESCALA, ESCALA);
  ctx.textBaseline = "middle";

  // fundo branco
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LARGURA, altura);

  let y = PAD;

  // ---- cabeçalho: logo + nome
  const logo = await carregarImagem("/imgs/logo02.png");
  if (logo) ctx.drawImage(logo, PAD, y + 4, 40, 40);
  ctx.fillStyle = "#15803d";
  ctx.font = `bold 17px ${FONTE}`;
  ctx.textAlign = "left";
  ctx.fillText("WinLeads", PAD + (logo ? 52 : 0), y + 17);
  ctx.fillStyle = "#737373";
  ctx.font = `12px ${FONTE}`;
  ctx.fillText("Cotação de plano de saúde", PAD + (logo ? 52 : 0), y + 36);
  y += alturaCabecalho;
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(LARGURA - PAD, y);
  ctx.stroke();
  y += 14;

  // ---- cliente / corretor / e-mail
  ctx.fillStyle = "#171717";
  for (const [rotulo, valor] of info) {
    ctx.font = `bold 14px ${FONTE}`;
    ctx.fillText(rotulo, PAD, y + 11);
    const w = ctx.measureText(rotulo).width;
    textoAjustado(ctx, valor, PAD + w + 6, y + 11, LARGURA - PAD * 2 - w - 6, 14, "normal");
    y += 22;
  }

  // ---- data
  ctx.fillStyle = "#525252";
  ctx.font = `12.5px ${FONTE}`;
  ctx.textAlign = "center";
  const data = p.geradoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  ctx.fillText(`Cotação criada em ${data}`, LARGURA / 2, y + alturaData / 2);
  y += alturaData;

  // ---- tabela
  const x0 = PAD;
  const larg = LARGURA - PAD * 2;
  const colRotulo = 150;
  linhas.forEach((l, i) => {
    ctx.fillStyle = i % 2 === 0 ? AZUL_LINHA : "#ffffff";
    ctx.fillRect(x0, y, larg, ALT_LINHA);
    ctx.fillStyle = "#171717";
    ctx.textAlign = "left";
    textoAjustado(ctx, l.rotulo, x0 + 10, y + ALT_LINHA / 2, colRotulo - 14, 13.5, "normal");
    ctx.textAlign = "center";
    textoAjustado(
      ctx,
      l.valor,
      x0 + colRotulo + (larg - colRotulo) / 2,
      y + ALT_LINHA / 2,
      larg - colRotulo - 16,
      13.5,
      "normal"
    );
    y += ALT_LINHA;
  });

  // total
  ctx.fillStyle = CINZA_TOTAL;
  ctx.fillRect(x0, y, larg, ALT_TOTAL);
  ctx.fillStyle = "#171717";
  ctx.textAlign = "left";
  ctx.font = `bold 15px ${FONTE}`;
  ctx.fillText("Total", x0 + 10, y + ALT_TOTAL / 2);
  ctx.textAlign = "center";
  ctx.fillText(brl(p.opcao.total), x0 + colRotulo + (larg - colRotulo) / 2, y + ALT_TOTAL / 2);

  // borda da tabela
  ctx.strokeStyle = "#d4d4d4";
  ctx.strokeRect(x0 + 0.5, y - linhas.length * ALT_LINHA + 0.5, larg - 1, linhas.length * ALT_LINHA + ALT_TOTAL - 1);
  y += ALT_TOTAL;

  // ---- rodapé
  ctx.fillStyle = "#737373";
  ctx.font = `11px ${FONTE}`;
  ctx.textAlign = "center";
  ctx.fillText("Valores mensais, sujeitos a reajuste e à aprovação da operadora.", LARGURA / 2, y + alturaRodape / 2);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar a imagem"))),
      "image/png"
    );
  });
}
