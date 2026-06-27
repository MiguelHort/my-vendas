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

  if (!sigHeader) return false;

  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx), p.slice(idx + 1)];
    }),
  ) as Record<string, string>;

  const timestamp = parts["t"];
  const v1 = parts["v1"];

  if (!timestamp || !v1) return false;

  // Rejeita webhooks com mais de 5 minutos de atraso (replay protection)
  const age = Date.now() / 1000 - Number(timestamp);
  if (age > 300) return false;

  const hexPart = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const payload = `${timestamp}.${rawBody}`;

  // Testa as 3 variações de chave para descobrir qual a Zavu usa
  const a = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const b = crypto.createHmac("sha256", hexPart).update(payload).digest("hex");
  const c = crypto.createHmac("sha256", Buffer.from(hexPart, "hex")).update(payload).digest("hex");

  console.log("[Zavu webhook] HMAC debug:", {
    received: v1,
    a_full_string: a,
    b_hex_stripped: b,
    c_hex_decoded: c,
    match_a: a === v1,
    match_b: b === v1,
    match_c: c === v1,
  });

  try {
    return crypto.timingSafeEqual(Buffer.from(c), Buffer.from(v1));
  } catch {
    return false;
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
