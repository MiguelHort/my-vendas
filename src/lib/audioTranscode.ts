import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

/**
 * Normaliza qualquer áudio gravado no navegador (webm/opus no Chrome/Edge,
 * mp4/aac no Safari, ogg/opus no Firefox) pro único formato que a Cloud API
 * do WhatsApp aceita de forma confiável: ogg com codec opus.
 *
 * Gravar direto em ogg/opus só funciona no Firefox — nos outros navegadores o
 * MediaRecorder produz um container incompleto que a Meta aceita no upload mas
 * falha ao entregar. Transcodificando aqui no servidor, o navegador pode gravar
 * no formato nativo dele e o resultado final que sobe pra Meta é sempre válido.
 */
export function transcodeToOggOpus(input: Buffer): Promise<Buffer> {
  if (!ffmpegPath) {
    return Promise.reject(new Error("ffmpeg-static não encontrou o binário do ffmpeg"));
  }
  const ffmpegBin: string = ffmpegPath;

  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegBin, [
      "-i", "pipe:0",
      "-vn",
      "-c:a", "libopus",
      "-application", "voip",
      "-ar", "48000",
      "-b:a", "32k",
      "-f", "ogg",
      "pipe:1",
    ]);

    const chunks: Buffer[] = [];
    let stderr = "";

    ff.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ff.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg saiu com código ${code}: ${stderr.slice(-2000)}`));
      }
    });

    ff.stdin.on("error", () => {
      // EPIPE quando o ffmpeg já fechou o stdin por erro — o handler "close" acima
      // já cobre o reject, aqui só evita um unhandled error no processo.
    });
    ff.stdin.end(input);
  });
}
