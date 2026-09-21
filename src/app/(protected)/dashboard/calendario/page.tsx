"use client";

import * as React from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPhoneNumber } from "@/lib/phoneMask";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListChecks,
  PhoneCall,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

// ========================
// TIPOS
// ========================

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee: { id: string; name: string } | null;
};

type LeadRetorno = {
  id: string;
  nome: string;
  status: string;
  telefone: string | null;
  origem: string;
  operadora_ofertada: string | null;
  retornar_em: string | null;
};

const PRIORITY_COLORS: Record<string, string> = {
  Baixa: "#94a3b8",
  Média: "#3b82f6",
  Alta: "#f59e0b",
  Urgente: "#ef4444",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const POLL_MS = 30000;

// ========================
// DATAS (sempre no fuso do navegador — as datas são gravadas como meia-noite local)
// ========================

function dayKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function keyFromIso(iso: string) {
  return dayKey(new Date(iso));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const longDayFmt = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function CalendarioPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [leads, setLeads] = React.useState<LeadRetorno[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [meId, setMeId] = React.useState<string | null>(null);
  const [taskFilter, setTaskFilter] = React.useState<"todas" | "minhas">("todas");

  const today = React.useMemo(() => new Date(), []);
  const todayKey = dayKey(today);
  const [viewMonth, setViewMonth] = React.useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedKey, setSelectedKey] = React.useState(todayKey);

  const authHeader = React.useCallback(async () => {
    if (!firebaseUser) return null;
    const token = await firebaseUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [firebaseUser]);

  const fetchData = React.useCallback(async () => {
    if (!firebaseUser) return;
    const headers = await authHeader();
    if (!headers) return;

    try {
      const res = await fetch("/api/tasks", { headers });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } catch {
      // silencioso — o próximo polling tenta de novo
    }

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });
      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data: LeadRetorno[] = await res.json();
        setLeads((data ?? []).filter((l) => l.status === "Retornar" && l.retornar_em));
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, authHeader]);

  React.useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    void fetchData();
    const interval = setInterval(fetchData, POLL_MS);
    return () => clearInterval(interval);
  }, [firebaseUser, loadingAuth, fetchData]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    (async () => {
      const headers = await authHeader();
      if (!headers) return;
      try {
        const res = await fetch("/api/me", { headers });
        if (res.ok) {
          const data = await res.json();
          setMeId(data.user?.id ?? null);
        }
      } catch {
        // silencioso
      }
    })();
  }, [firebaseUser, authHeader]);

  // ========================
  // AGRUPAMENTO POR DIA
  // ========================

  const visibleTasks = React.useMemo(
    () =>
      tasks.filter(
        (t) => t.due_date && (taskFilter === "todas" || t.assignee?.id === meId)
      ),
    [tasks, taskFilter, meId]
  );

  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of visibleTasks) {
      const k = keyFromIso(t.due_date!);
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return map;
  }, [visibleTasks]);

  const leadsByDay = React.useMemo(() => {
    const map = new Map<string, LeadRetorno[]>();
    for (const l of leads) {
      const k = keyFromIso(l.retornar_em!);
      map.set(k, [...(map.get(k) ?? []), l]);
    }
    return map;
  }, [leads]);

  // Atrasados: ainda abertos e com data anterior a hoje.
  const overdueTasks = React.useMemo(
    () => visibleTasks.filter((t) => t.status !== "Concluído" && keyFromIso(t.due_date!) < todayKey),
    [visibleTasks, todayKey]
  );
  const overdueLeads = React.useMemo(
    () => leads.filter((l) => keyFromIso(l.retornar_em!) < todayKey),
    [leads, todayKey]
  );

  // ========================
  // GRADE DO MÊS (6 semanas, começando no domingo)
  // ========================

  const cells = React.useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  function goToMonth(delta: number) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function goToToday() {
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(todayKey);
  }

  const selectedDate = React.useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedKey]);
  const selectedTasks = tasksByDay.get(selectedKey) ?? [];
  const selectedLeads = leadsByDay.get(selectedKey) ?? [];
  const showOverdue = selectedKey === todayKey;

  if (loadingAuth || loading) {
    return (
      <Layout fullWidth>
        <div className="space-y-2 mb-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-56" />
        </div>
        <div className="flex flex-col lg:flex-row gap-4">
          <Skeleton className="h-[34rem] flex-1 rounded-xl" />
          <Skeleton className="h-[34rem] lg:w-96 rounded-xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Agenda</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Calendário</h1>
          <p className="text-sm text-muted-foreground">
            Tarefas com prazo e leads agendados para retornar, dia a dia
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border bg-background/60 backdrop-blur-sm px-3 py-1.5 shadow-sm self-start sm:self-auto">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select value={taskFilter} onValueChange={(v) => setTaskFilter(v as typeof taskFilter)}>
            <SelectTrigger className="border-0 h-auto p-0 text-xs font-medium bg-transparent shadow-none w-auto gap-1 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="todas">Todas as tarefas</SelectItem>
              <SelectItem value="minhas">Tarefas atribuídas a mim</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ── Grade do mês ── */}
        <section className="w-full lg:flex-1 min-w-0 rounded-xl border bg-card p-3 md:p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {capitalize(monthFmt.format(viewMonth))}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => goToMonth(-1)}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => goToMonth(1)}
                aria-label="Próximo mês"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px text-center text-[11px] font-medium text-muted-foreground mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d) => {
              const key = dayKey(d);
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const dayTasks = tasksByDay.get(key) ?? [];
              const dayLeads = leadsByDay.get(key) ?? [];
              const pending = dayTasks.filter((t) => t.status !== "Concluído").length;
              const done = dayTasks.length - pending;
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-1.5 min-h-16 md:min-h-24 text-left transition-colors hover:bg-muted/60",
                    !inMonth && "opacity-40",
                    isSelected && "border-primary ring-1 ring-primary bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5 w-full">
                    {pending > 0 && (
                      <span className="truncate rounded px-1 py-0.5 text-[10px] leading-none font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300">
                        {pending} {pending === 1 ? "tarefa" : "tarefas"}
                      </span>
                    )}
                    {pending === 0 && done > 0 && (
                      <span className="truncate rounded px-1 py-0.5 text-[10px] leading-none font-medium bg-muted text-muted-foreground">
                        {done} concl.
                      </span>
                    )}
                    {dayLeads.length > 0 && (
                      <span className="truncate rounded px-1 py-0.5 text-[10px] leading-none font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        {dayLeads.length} {dayLeads.length === 1 ? "retorno" : "retornos"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Painel do dia ── */}
        <aside className="w-full lg:w-96 shrink-0 rounded-xl border bg-card p-4 space-y-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {capitalize(longDayFmt.format(selectedDate))}
            </h2>
            {selectedKey === todayKey && (
              <p className="text-xs text-muted-foreground">Hoje</p>
            )}
          </div>

          {showOverdue && (overdueTasks.length > 0 || overdueLeads.length > 0) && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                <AlertTriangle className="size-4" />
                Atrasados
              </div>
              {overdueTasks.map((t) => (
                <TaskRow key={t.id} task={t} showDate />
              ))}
              {overdueLeads.map((l) => (
                <LeadRow key={l.id} lead={l} showDate />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <ListChecks className="size-4 text-blue-500" />
                Tarefas do dia
              </h3>
              <Link
                href="/dashboard/demandas"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Demandas <ExternalLink className="size-3" />
              </Link>
            </div>
            {selectedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa com prazo nesse dia.</p>
            ) : (
              selectedTasks.map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <PhoneCall className="size-4 text-amber-500" />
                Leads para chamar
              </h3>
              <Link
                href="/dashboard/funil"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Funil <ExternalLink className="size-3" />
              </Link>
            </div>
            {selectedLeads.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum lead agendado pra esse dia.</p>
            ) : (
              selectedLeads.map((l) => <LeadRow key={l.id} lead={l} />)
            )}
          </div>
        </aside>
      </div>
    </Layout>
  );
}

// ========================
// LINHAS DO PAINEL
// ========================

const shortDayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

function TaskRow({ task, showDate }: { task: Task; showDate?: boolean }) {
  const done = task.status === "Concluído";
  return (
    <div className="rounded-lg border bg-background p-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm font-medium leading-snug", done && "line-through text-muted-foreground")}>
          {task.title}
        </p>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] ?? "#94a3b8" }}
        >
          {task.priority}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <span>{task.status}</span>
        {task.assignee && <span>{task.assignee.name}</span>}
        {showDate && task.due_date && <span>prazo {shortDayFmt.format(new Date(task.due_date))}</span>}
      </div>
    </div>
  );
}

function LeadRow({ lead, showDate }: { lead: LeadRetorno; showDate?: boolean }) {
  return (
    <div className="rounded-lg border bg-background p-2.5 space-y-1">
      <p className="text-sm font-medium leading-snug">{lead.nome}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        {lead.telefone && <span>{formatPhoneNumber(lead.telefone.replace(/^55/, ""))}</span>}
        {lead.operadora_ofertada && <span>{lead.operadora_ofertada}</span>}
        <span>{lead.origem}</span>
        {showDate && lead.retornar_em && (
          <span>retorno {shortDayFmt.format(new Date(lead.retornar_em))}</span>
        )}
      </div>
    </div>
  );
}
