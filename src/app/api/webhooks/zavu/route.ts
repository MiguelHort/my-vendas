import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleIncomingMessage, parseZavuPayload } from "@/lib/sdr/orchestrator";

export const runtime = "nodejs";

/**
 * Verifica a assinatura HMAC-SHA256 do webhook Zavu.
 * Loga os headers recebidos para diagnóstico.
 */
async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.ZAVU_WEBHOOK_SECRET;

  // Loga headers relevantes para diagnóstico
  const sigHeader = req.headers.get("x-zavu-signature") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  console.log("[Zavu webhook] headers de assinatura:", {
    "x-zavu-signature": sigHeader || "(ausente)",
    "authorization": authHeader ? "(presente)" : "(ausente)",
    "user-agent": req.headers.get("user-agent") ?? "",
    secret_configured: !!secret,
  });

  if (!secret) {
    // Sem secret configurado: aceita (dev/diagnóstico)
    return true;
  }

  if (!sigHeader) {
    // Zavu não enviou header de assinatura — aceita e loga aviso
    console.warn("[Zavu webhook] AVISO: nenhum header x-zavu-signature recebido. Verificar formato na doc da Zavu.");
    return true;
  }

  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx), p.slice(idx + 1)];
    }),
  ) as Record<string, string>;

  const timestamp = parts["t"];
  const v1 = parts["v1"];

  if (!timestamp || !v1) {
    console.warn("[Zavu webhook] AVISO: formato de assinatura inesperado:", sigHeader);
    return true; // aceita para diagnóstico
  }

  // Verifica idade (5 min) — apenas loga para diagnóstico
  const age = Date.now() / 1000 - Number(timestamp);
  if (age > 300) console.warn("[Zavu webhook] Webhook com mais de 5min de atraso. age:", age);

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    if (!valid) {
      console.warn("[Zavu webhook] Assinatura HMAC inválida. expected:", expected, "received:", v1);
      // TODO: reativar rejeição após confirmar o formato correto da Zavu
    }
    return true; // aceita temporariamente para diagnóstico
  } catch {
    console.warn("[Zavu webhook] Erro ao comparar assinaturas. expected:", expected, "received:", v1);
    return true; // aceita para diagnóstico
  }
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
