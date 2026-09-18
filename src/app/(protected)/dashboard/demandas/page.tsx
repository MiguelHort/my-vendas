"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  Kanban,
  Plus,
  Filter,
  Calendar,
  Trash2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Pencil,
} from "lucide-react";

// ========================
// TIPOS
// ========================

type TaskUser = { id: string; name: string };

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: TaskUser;
  assignee: TaskUser | null;
};

type Column = { id: string; title: string; color: string };

// ========================
// COLUNAS E PRIORIDADES FIXAS
// ========================

const COLUMNS: Column[] = [
  { id: "A Fazer", title: "A Fazer", color: "#94a3b8" },
  { id: "Em Andamento", title: "Em Andamento", color: "#3b82f6" },
  { id: "Concluído", title: "Concluído", color: "#22c55e" },
];

const PRIORITIES = ["Baixa", "Média", "Alta", "Urgente"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  Baixa: "#94a3b8",
  Média: "#3b82f6",
  Alta: "#f59e0b",
  Urgente: "#ef4444",
};

const TASKS_POLL_MS = 15000;

// ========================
// HELPERS
// ========================

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-600",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
];

function colorForSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDueDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function isOverdue(dueDateIso: string, status: string) {
  if (status === "Concluído") return false;
  return new Date(dueDateIso + "T23:59:59") < new Date();
}

type TaskFormState = {
  title: string;
  description: string;
  priority: string;
  assigneeId: string;
  dueDate: string;
};

const EMPTY_FORM: TaskFormState = {
  title: "",
  description: "",
  priority: "Média",
  assigneeId: "none",
  dueDate: "",
};

export default function DemandasPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [users, setUsers] = React.useState<TaskUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [meId, setMeId] = React.useState<string | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  const [assigneeFilter, setAssigneeFilter] = React.useState<"todas" | "minhas" | "criadas">(
    "todas"
  );

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [form, setForm] = React.useState<TaskFormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<Task | null>(null);
  const [deletePassword, setDeletePassword] = React.useState("");
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const authHeader = React.useCallback(async () => {
    if (!firebaseUser) return null;
    const token = await firebaseUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [firebaseUser]);

  const fetchTasks = React.useCallback(async () => {
    const headers = await authHeader();
    if (!headers) return;
    try {
      const res = await fetch("/api/tasks", { headers });
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch {
      // silencioso — próximo polling tenta de novo
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  React.useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    fetchTasks();
    const interval = setInterval(fetchTasks, TASKS_POLL_MS);
    return () => clearInterval(interval);
  }, [firebaseUser, loadingAuth, fetchTasks]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    (async () => {
      const headers = await authHeader();
      if (!headers) return;
      try {
        const res = await fetch("/api/users", { headers });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users ?? []);
        }
      } catch {
        // silencioso
      }
      try {
        const res = await fetch("/api/me", { headers });
        if (res.ok) {
          const data = await res.json();
          setMeId(data.user?.id ?? null);
          setIsAdmin(data.user?.role === "ADMIN");
        }
      } catch {
        // silencioso
      }
    })();
  }, [firebaseUser, authHeader]);

  // ========================
  // FILTRO
  // ========================

  const visibleTasks = React.useMemo(() => {
    if (assigneeFilter === "minhas") return tasks.filter((t) => t.assignee?.id === meId);
    if (assigneeFilter === "criadas") return tasks.filter((t) => t.created_by.id === meId);
    return tasks;
  }, [tasks, assigneeFilter, meId]);

  const getTasksByStatus = (status: string) =>
    visibleTasks
      .filter((t) => t.status === status)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ========================
  // DRAG & DROP
  // ========================

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStatus = destination.droppableId;
    const taskId = draggableId;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previous = [...tasks];
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setTasks(previous);
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Erro ao mover demanda");
      }
    } catch (err) {
      console.error(err);
      setTasks(previous);
      toast.error("Erro ao mover demanda");
    }
  };

  // ========================
  // CRIAR / EDITAR
  // ========================

  function openCreateModal() {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      assigneeId: task.assignee?.id ?? "none",
      dueDate: task.due_date ? task.due_date.slice(0, 10) : "",
    });
    setFormOpen(true);
  }

  async function handleSaveTask() {
    if (!form.title.trim()) {
      toast.error("Dê um título pra demanda");
      return;
    }
    setSaving(true);
    try {
      const headers = await authHeader();
      if (!headers) return;

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        assignee_id: form.assigneeId === "none" ? null : form.assigneeId,
        due_date: form.dueDate ? new Date(form.dueDate + "T00:00:00").toISOString() : null,
      };

      const res = editingTask
        ? await fetch(`/api/tasks/${editingTask.id}`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/tasks", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar demanda");

      toast.success(editingTask ? "Demanda atualizada" : "Demanda criada");
      setFormOpen(false);
      await fetchTasks();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao salvar demanda");
    } finally {
      setSaving(false);
    }
  }

  // ========================
  // EXCLUIR
  // ========================

  function openDeleteDialog(task: Task) {
    setDeleteTarget(task);
    setDeletePassword("");
    setDeleteError(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return;
    if (!deletePassword) {
      setDeleteError("Digite sua senha pra confirmar");
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`/api/tasks/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Erro ao excluir demanda");
        return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success("Demanda excluída");
      setDeleteTarget(null);
      setDeletePassword("");
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      setDeleteError("Erro ao excluir demanda");
    } finally {
      setDeleting(false);
    }
  }

  const canDelete = (task: Task) => task.created_by.id === meId || isAdmin;

  // ========================
  // RENDER
  // ========================

  if (loadingAuth || loading) {
    return (
      <Layout fullWidth>
        <div className="space-y-2 mb-6">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col min-w-72 w-72 shrink-0 gap-2">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl opacity-60" />
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Kanban className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Kanban</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Demandas</h1>
          <p className="text-sm text-muted-foreground">
            Crie e acompanhe tarefas entre a equipe — arraste os cards pra mudar o status
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-2 rounded-xl border bg-background/60 backdrop-blur-sm px-3 py-1.5 shadow-sm">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v as typeof assigneeFilter)}>
              <SelectTrigger className="border-0 h-auto p-0 text-xs font-medium bg-transparent shadow-none w-auto gap-1 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="todas">Todas as demandas</SelectItem>
                <SelectItem value="minhas">Atribuídas a mim</SelectItem>
                <SelectItem value="criadas">Criadas por mim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova demanda
          </Button>
        </div>
      </header>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
          {COLUMNS.map((column) => {
            const colTasks = getTasksByStatus(column.id);
            return (
              <div key={column.id} className="flex flex-col min-w-72 w-72 shrink-0">
                {/* Cabeçalho da coluna */}
                <div
                  className="p-3 rounded-xl mb-2 border"
                  style={{ backgroundColor: column.color + "15", borderColor: column.color + "30" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
                      <h3 className="font-semibold text-sm truncate">{column.title}</h3>
                    </div>
                    <span
                      className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums shrink-0"
                      style={{
                        color: column.color,
                        backgroundColor: column.color + "18",
                        boxShadow: `0 0 0 1px ${column.color}40`,
                      }}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex-1 space-y-2 rounded-xl p-1 transition-colors"
                      style={{
                        minHeight: 120,
                        backgroundColor: snapshot.isDraggingOver ? column.color + "15" : "transparent",
                      }}
                    >
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          Nenhuma demanda aqui
                        </p>
                      )}
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(providedDraggable) => (
                            <div
                              ref={providedDraggable.innerRef}
                              {...providedDraggable.draggableProps}
                              {...providedDraggable.dragHandleProps}
                              onClick={() => openEditModal(task)}
                              className="group rounded-xl border bg-card p-3 space-y-2 shadow-sm hover:shadow-md hover:border-primary/30 cursor-pointer transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
                                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                              </div>

                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex items-center justify-between gap-2 pt-1">
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                  style={{ backgroundColor: PRIORITY_COLORS[task.priority] ?? "#94a3b8" }}
                                >
                                  {task.priority}
                                </span>

                                {task.due_date && (
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                                      isOverdue(task.due_date, task.status)
                                        ? "text-destructive"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    {formatDueDate(task.due_date)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                                <span className="text-[10px] text-muted-foreground truncate">
                                  por {task.created_by.name}
                                </span>
                                {task.assignee ? (
                                  <span
                                    className={`flex size-5 shrink-0 items-center justify-center rounded-full text-white text-[9px] font-semibold ${colorForSeed(
                                      task.assignee.id
                                    )}`}
                                    title={task.assignee.name}
                                  >
                                    {initialsFor(task.assignee.name)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/60 shrink-0">
                                    Sem responsável
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* ── MODAL CRIAR/EDITAR ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                <Kanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight">
                  {editingTask ? "Editar demanda" : "Nova demanda"}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {editingTask
                    ? "Atualize os detalhes ou mude o responsável."
                    : "Descreva a tarefa e atribua a alguém da equipe."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Atualizar tabela de preços da operadora X"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detalhes da demanda..."
                className="min-h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={form.assigneeId}
                  onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prazo (opcional)</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {editingTask && canDelete(editingTask) ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive gap-2"
                onClick={() => openDeleteDialog(editingTask)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTask} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTask ? "Salvar" : "Criar demanda"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL EXCLUIR (senha) ── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
            setDeletePassword("");
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              <DialogTitle>Excluir demanda</DialogTitle>
            </div>
            <DialogDescription>
              Isso vai apagar permanentemente a demanda{" "}
              <strong>{deleteTarget?.title}</strong>. Essa ação não pode ser desfeita. Digite sua
              senha pra confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Input
              type="password"
              autoFocus
              autoComplete="current-password"
              placeholder="Sua senha"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleDeleteConfirm()}
              disabled={deleting}
            />
            {deleteError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                {deleteError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeletePassword("");
                setDeleteError(null);
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Excluir demanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
