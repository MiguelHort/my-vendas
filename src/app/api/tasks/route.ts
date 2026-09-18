import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { TASK_PRIORITIES, taskToDto } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const includeRelations = {
  createdBy: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
} as const;

/** Lista todas as demandas — compartilhadas entre a equipe, igual os leads. */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const tasks = await prisma.task.findMany({
    include: includeRelations,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks: tasks.map(taskToDto) });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const title: string | undefined = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }

  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const priority = TASK_PRIORITIES.includes(body?.priority) ? body.priority : "Média";
  const assigneeId =
    typeof body?.assignee_id === "string" && body.assignee_id ? body.assignee_id : null;
  const dueDate = body?.due_date ? new Date(body.due_date) : null;

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        assigneeId,
        dueDate,
        createdById: auth.user.id,
      },
      include: includeRelations,
    });
    return NextResponse.json({ task: taskToDto(task) }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar demanda:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erro ao criar demanda" }, { status: 500 });
  }
}
