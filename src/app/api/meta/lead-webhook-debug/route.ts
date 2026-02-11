import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const text = await req.text(); // não quebra se vier payload estranho
  console.log("🔥 WEBHOOK DEBUG HIT");
  console.log("method:", req.method);
  console.log("headers:", Object.fromEntries(req.headers.entries()));
  console.log("body:", text);

  return NextResponse.json({ ok: true, debug: true });
}

export async function GET() {
  console.log("🔥 WEBHOOK DEBUG GET HIT");
  return NextResponse.json({ ok: true, debug: true });
}