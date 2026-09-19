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

/** Igual a `requireUser`, mas só deixa passar ADMIN (ex: financeiro da empresa). */
export async function requireAdmin(req: NextRequest) {
  const result = await requireUser(req);
  if ("error" in result) return result;
  if (result.user.role !== "ADMIN") {
    return { error: "Acesso restrito a administradores", status: 403 as const };
  }
  return result;
}
