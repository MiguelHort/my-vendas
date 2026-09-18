import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { verifyFirebasePassword } from "@/lib/firebaseAuthRest";
import { TASK_PRIORITIES, TASK_STATUSES, taskToDto } from "@/lib/tasks";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const includeRelations = {
  createdBy: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
} as const;

/**
 * Atualiza uma demanda — título/descrição/status/prioridade/responsável/prazo.
 * Usada tanto pelo drag-and-drop do kanban (só `status`) quanto pelo modal de edição.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const data: Prisma.TaskUpdateInput = {};

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "Título não pode ficar vazio" }, { status: 400 });
    data.title = title;
  }
  if (body.description !== undefined) {
    data.description = typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  }
  if (typeof body.status === "string") {
    if (!TASK_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (typeof body.priority === "string") {
    if (!TASK_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: "Prioridade inválida" }, { status: 400 });
    }
    data.priority = body.priority;
  }
  if (body.due_date !== undefined) {
    data.dueDate = body.due_date ? new Date(body.due_date) : null;
  }
  if (body.assignee_id !== undefined) {
    data.assignee = body.assignee_id
      ? { connect: { id: body.assignee_id } }
      : { disconnect: true };
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  try {
    const task = await prisma.task.update({ where: { id }, data, include: includeRelations });
    return NextResponse.json({ task: taskToDto(task) });
  } catch (err) {
    console.error("Erro ao atualizar demanda:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Demanda não encontrada" }, { status: 404 });
  }
}

/**
 * Só quem criou a demanda (ou um admin) pode excluir — e só com a senha da
 * própria conta (ação destrutiva e irreversível, mesmo padrão de excluir
 * conversa de WhatsApp — ver [[feedback_delete_confirmacao_senha]]).
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const password = body?.password as string | undefined;

  if (!password) {
    return NextResponse.json({ error: "Senha é obrigatória" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id }, select: { createdById: true } });
  if (!task) {
    return NextResponse.json({ error: "Demanda não encontrada" }, { status: 404 });
  }

  const canDelete = task.createdById === auth.user.id || auth.user.role === "ADMIN";
  if (!canDelete) {
    return NextResponse.json(
      { error: "Só quem criou a demanda (ou um admin) pode excluí-la" },
      { status: 403 }
    );
  }

  let passwordOk: boolean;
  try {
    passwordOk = await verifyFirebasePassword(auth.user.email, password);
  } catch (err) {
    console.error("Erro ao validar senha:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao validar senha" },
      { status: 500 }
    );
  }
  if (!passwordOk) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
