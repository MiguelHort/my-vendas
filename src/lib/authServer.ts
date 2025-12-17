// src/lib/authServer.ts
import { NextRequest } from "next/server";
import { auth as firebaseAdmin } from "@/lib/firebaseAdmin";
import { prisma } from "@/lib/prisma";

export async function requireUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return { error: "Não autenticado", status: 401 as const };

  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const decoded = await firebaseAdmin.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) return { error: "Usuário não encontrado", status: 404 as const };

    return { user };
  } catch (e) {
    return { error: "Token inválido", status: 401 as const };
  }
}

export function makeSupervisorCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}