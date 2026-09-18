/**
 * Demandas (kanban interno estilo Jira) — compartilhado entre as rotas de API.
 * Colunas e prioridades são fixas no código (mesma convenção do `Lead.status`
 * no funil): sem tela de configuração, só editar aqui se precisar mudar.
 */

export const TASK_STATUSES = ["A Fazer", "Em Andamento", "Concluído"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["Baixa", "Média", "Alta", "Urgente"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

type TaskUserRef = { id: string; name: string | null; email: string };

type TaskWithRelations = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: TaskUserRef;
  assignee: TaskUserRef | null;
};

function userDto(u: TaskUserRef) {
  return { id: u.id, name: u.name || u.email };
}

export function taskToDto(t: TaskWithRelations) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    due_date: t.dueDate ? t.dueDate.toISOString() : null,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
    created_by: userDto(t.createdBy),
    assignee: t.assignee ? userDto(t.assignee) : null,
  };
}
