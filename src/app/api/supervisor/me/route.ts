// app/api/supervisor/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const me = auth.user;
  return NextResponse.json({ id: me.id, isSupervisor: me.isSupervisor });
}