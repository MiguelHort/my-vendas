import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { fetchWhatsAppTemplates } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lista os Message Templates aprovados da conta — usados pra responder contatos
 * fora da janela de 24h (a Meta rejeita texto livre nesse caso, só template funciona).
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const templates = await fetchWhatsAppTemplates();
    return NextResponse.json({
      templates: templates
        .filter((t) => t.status === "APPROVED")
        .map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          language: t.language,
          body_text: t.bodyText,
          param_tokens: t.paramTokens,
          params_are_named: t.paramsAreNamed,
        })),
    });
  } catch (err) {
    console.error("Erro ao listar templates WhatsApp:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erro ao listar templates do WhatsApp" }, { status: 502 });
  }
}
