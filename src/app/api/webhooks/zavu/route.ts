import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleIncomingMessage, parseZavuPayload } from "@/lib/sdr/orchestrator";

export const runtime = "nodejs";

/**
 * Verifica a assinatura HMAC-SHA256 do webhook Zavu.
 * Header: X-Zavu-Signature: t=<timestamp>,v1=<hmac>
 * Payload assinado: "${timestamp}.${rawBody}"
 */
async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.ZAVU_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret configurado: passa (apenas em dev)

  const sigHeader = req.headers.get("x-zavu-signature") ?? "";
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => p.split("=")),
  ) as Record<string, string>;

  const timestamp = parts["t"];
  const v1 = parts["v1"];

  if (!timestamp || !v1) return false;

  // Rejeita webhooks com mais de 5 minutos de atraso
  const age = Date.now() / 1000 - Number(timestamp);
  if (age > 300) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  const valid = await verifySignature(req, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Responde 200 imediatamente (Zavu re-tentará se não receber 200)
  const response = NextResponse.json({ ok: true });

  setImmediate(async () => {
    try {
      const msg = parseZavuPayload(body);
      if (msg) {
        await handleIncomingMessage(msg);
      }
    } catch (err) {
      console.error("[SDR webhook Zavu] Erro ao processar mensagem:", err);
    }
  });

  return response;
}
