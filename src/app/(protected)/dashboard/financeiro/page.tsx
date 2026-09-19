"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Wallet,
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  Repeat,
  ReceiptText,
  ShieldAlert,
  AlertCircle,
  Loader2,
  BadgeDollarSign,
  CalendarOff,
} from "lucide-react";
import {
  SOCIOS,
  currentMonthKey,
  shiftMonth,
  summarize,
  type FinanceEntryDto,
  type FixedCostDto,
} from "@/lib/finance";

// ========================
// TIPOS / HELPERS
// ========================

type VendaPendente = {
  lead_id: string;
  nome: string;
  valor: number;
  data: string | null;
  data_venda: string | null;
  tem_data_pagamento: boolean;
  previsto: boolean;
};

type FormKind = "ENTRADA" | "DESPESA_EVENTUAL" | "FIXA";

type FormState = {
  kind: FormKind;
  editingId: string | null;
  descricao: string;
  valor: string;
  data: string;
  dia: string;
};

type DeleteTarget =
  | { kind: "entry"; id: string; label: string }
  | { kind: "fixed"; id: string; label: string };

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function formatDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Data padrão do lançamento novo: hoje se estiver no mês exibido, senão dia 1 dele. */
function defaultDateFor(month: string) {
  const today = todayISO();
  return today.startsWith(month) ? today : `${month}-01`;
}

const FORM_TITLES: Record<FormKind, string> = {
  ENTRADA: "entrada",
  DESPESA_EVENTUAL: "despesa eventual",
  FIXA: "conta fixa",
};

// ========================
// PÁGINA
// ========================

export default function FinanceiroPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [month, setMonth] = React.useState(currentMonthKey);
  const [entries, setEntries] = React.useState<FinanceEntryDto[]>([]);
  const [fixedCosts, setFixedCosts] = React.useState<FixedCostDto[]>([]);
  const [vendasPendentes, setVendasPendentes] = React.useState<VendaPendente[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [forbidden, setForbidden] = React.useState(false);
  const [lancandoLead, setLancandoLead] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<FormState | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);
  const [deletePassword, setDeletePassword] = React.useState("");
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const authHeader = React.useCallback(async () => {
    if (!firebaseUser) return null;
    const token = await firebaseUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [firebaseUser]);

  const fetchData = React.useCallback(async () => {
    const headers = await authHeader();
    if (!headers) return;
    try {
      const res = await fetch(`/api/finance?month=${month}`, { headers });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        toast.error("Erro ao carregar o financeiro");
        return;
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
      setFixedCosts(data.fixed_costs ?? []);
      setVendasPendentes(data.vendas_pendentes ?? []);
    } catch {
      toast.error("Erro ao carregar o financeiro");
    } finally {
      setLoading(false);
    }
  }, [authHeader, month]);

  React.useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    setLoading(true);
    fetchData();
  }, [firebaseUser, loadingAuth, fetchData]);

  const entradas = React.useMemo(() => entries.filter((e) => e.tipo === "ENTRADA"), [entries]);
  const eventuais = React.useMemo(
    () => entries.filter((e) => e.tipo === "DESPESA_EVENTUAL"),
    [entries]
  );
  const summary = React.useMemo(() => summarize(entries, fixedCosts), [entries, fixedCosts]);

  // ========================
  // FORM
  // ========================

  function openCreate(kind: FormKind) {
    setForm({
      kind,
      editingId: null,
      descricao: "",
      valor: "",
      data: defaultDateFor(month),
      dia: "5",
    });
  }

  function openEditEntry(e: FinanceEntryDto) {
    setForm({
      kind: e.tipo,
      editingId: e.id,
      descricao: e.descricao,
      valor: String(e.valor).replace(".", ","),
      data: e.data,
      dia: "5",
    });
  }

  function openEditFixed(c: FixedCostDto) {
    setForm({
      kind: "FIXA",
      editingId: c.id,
      descricao: c.descricao,
      valor: String(c.valor).replace(".", ","),
      data: defaultDateFor(month),
      dia: String(c.dia_vencimento),
    });
  }

  async function handleSave() {
    if (!form) return;
    if (!form.descricao.trim()) {
      toast.error("Dê uma descrição");
      return;
    }
    if (!form.valor.trim()) {
      toast.error("Informe o valor");
      return;
    }
    setSaving(true);
    try {
      const headers = await authHeader();
      if (!headers) return;

      const isFixed = form.kind === "FIXA";
      const base = isFixed ? "/api/finance/fixed" : "/api/finance";
      const url = form.editingId ? `${base}/${form.editingId}` : base;
      const payload = isFixed
        ? {
            descricao: form.descricao.trim(),
            valor: form.valor,
            dia_vencimento: Number(form.dia),
            ...(form.editingId ? {} : { inicio: month }),
          }
        : {
            descricao: form.descricao.trim(),
            valor: form.valor,
            data: form.data,
            ...(form.editingId ? {} : { tipo: form.kind }),
          };

      const res = await fetch(url, {
        method: form.editingId ? "PATCH" : "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");

      toast.success(form.editingId ? "Atualizado" : "Lançamento criado");
      setForm(null);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  // ========================
  // AÇÕES
  // ========================

  async function handleLancarVenda(leadId: string) {
    setLancandoLead(leadId);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao lançar venda");
      toast.success("Venda lançada como entrada");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao lançar venda");
    } finally {
      setLancandoLead(null);
    }
  }

  async function handleEncerrarFixa(c: FixedCostDto) {
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`/api/finance/fixed/${c.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ fim: shiftMonth(month, -1) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao encerrar");
      toast.success(`"${c.descricao}" encerrada a partir de ${monthLabel(month)}`);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao encerrar");
    }
  }

  function closeDelete() {
    setDeleteTarget(null);
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
      const url =
        deleteTarget.kind === "fixed"
          ? `/api/finance/fixed/${deleteTarget.id}`
          : `/api/finance/${deleteTarget.id}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error ?? "Erro ao excluir");
        return;
      }
      toast.success("Excluído");
      closeDelete();
      setForm(null);
      await fetchData();
    } catch {
      setDeleteError("Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  // ========================
  // RENDER
  // ========================

  if (forbidden) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <ShieldAlert className="size-10 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            O financeiro da empresa só pode ser visto por administradores.
          </p>
        </div>
        </div>
      </Layout>
    );
  }

  if (loadingAuth || (loading && entries.length === 0 && fixedCosts.length === 0)) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="space-y-2 mb-6">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-56" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        </div>
      </Layout>
    );
  }

  const resultadoPositivo = summary.resultado >= 0;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Admin</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Entradas, contas fixas e despesas da empresa — e quanto sobrou pra cada sócio
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-xl border bg-background/60 px-1.5 py-1 shadow-sm self-start sm:self-auto">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Mês anterior"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">{monthLabel(month)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Próximo mês"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      {/* Vendas concluídas ainda não lançadas */}
      {vendasPendentes.length > 0 && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BadgeDollarSign className="size-4 text-primary" />
              {vendasPendentes.length === 1
                ? "1 venda concluída neste mês ainda não foi lançada como entrada"
                : `${vendasPendentes.length} vendas concluídas neste mês ainda não foram lançadas como entrada`}
            </div>
            <ul className="divide-y divide-border/60">
              {vendasPendentes.map((v) => (
                <li key={v.lead_id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{v.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.tem_data_pagamento
                        ? `${v.previsto ? "Cai em" : "Caiu em"} ${formatDay(v.data!)}`
                        : `Sem data de pagamento (venda em ${v.data ? formatDay(v.data) : "—"})`}{" "}
                      · comissão {brl(v.valor)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLancarVenda(v.lead_id)}
                    disabled={lancandoLead === v.lead_id}
                  >
                    {lancandoLead === v.lead_id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Lançar
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <SummaryCard
          icon={<TrendingUp className="size-4" />}
          label="Entradas"
          value={brl(summary.entradas)}
          tone="positive"
        />
        <SummaryCard
          icon={<TrendingDown className="size-4" />}
          label="Despesas"
          value={brl(summary.despesas)}
          hint={`${brl(summary.despesasFixas)} fixas · ${brl(summary.despesasEventuais)} eventuais`}
          tone="negative"
        />
        <SummaryCard
          icon={<Scale className="size-4" />}
          label="Resultado do mês"
          value={brl(summary.resultado)}
          hint="Entradas − despesas"
          tone={resultadoPositivo ? "positive" : "negative"}
        />
      </div>

      {/* Sócios */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Divisão entre os sócios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.socios.map((s) => (
              <div key={s.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{s.nome}</span>
                  <span className="text-xs font-medium rounded-full bg-muted px-2 py-0.5">
                    {s.percentual}%
                  </span>
                </div>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    s.valor < 0 ? "text-destructive" : ""
                  }`}
                >
                  {brl(s.valor)}
                </p>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${s.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {SOCIOS.map((s) => `${s.nome} ${s.percentual}%`).join(" · ")} — sobre o resultado do mês
            (entradas menos todas as despesas).
          </p>
        </CardContent>
      </Card>

      {/* Listas */}
      <div className="grid gap-4 lg:grid-cols-3 pb-8">
        {/* Entradas */}
        <ListCard
          title="Entradas"
          icon={<TrendingUp className="size-4 text-emerald-600" />}
          total={brl(summary.entradas)}
          onAdd={() => openCreate("ENTRADA")}
          empty="Nenhuma entrada neste mês"
        >
          {entradas.map((e) => (
            <Row
              key={e.id}
              title={e.descricao}
              subtitle={`${formatDay(e.data)}${e.lead_id ? " · venda" : ""}`}
              value={brl(e.valor)}
              valueClass="text-emerald-600"
              onEdit={() => openEditEntry(e)}
              onDelete={() => setDeleteTarget({ kind: "entry", id: e.id, label: e.descricao })}
            />
          ))}
        </ListCard>

        {/* Contas fixas */}
        <ListCard
          title="Contas fixas"
          icon={<Repeat className="size-4 text-amber-600" />}
          total={brl(summary.despesasFixas)}
          onAdd={() => openCreate("FIXA")}
          empty="Nenhuma conta fixa neste mês"
        >
          {fixedCosts.map((c) => (
            <Row
              key={c.id}
              title={c.descricao}
              subtitle={`Vence dia ${c.dia_vencimento}${c.fim ? ` · até ${monthLabel(c.fim)}` : ""}`}
              value={brl(c.valor)}
              valueClass="text-destructive"
              onEdit={() => openEditFixed(c)}
              onDelete={() => setDeleteTarget({ kind: "fixed", id: c.id, label: c.descricao })}
              extra={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  title="Encerrar a partir deste mês"
                  aria-label="Encerrar conta a partir deste mês"
                  onClick={() => handleEncerrarFixa(c)}
                >
                  <CalendarOff className="size-3.5" />
                </Button>
              }
            />
          ))}
        </ListCard>

        {/* Despesas eventuais */}
        <ListCard
          title="Despesas eventuais"
          icon={<ReceiptText className="size-4 text-rose-600" />}
          total={brl(summary.despesasEventuais)}
          onAdd={() => openCreate("DESPESA_EVENTUAL")}
          empty="Nenhuma despesa eventual neste mês"
        >
          {eventuais.map((e) => (
            <Row
              key={e.id}
              title={e.descricao}
              subtitle={formatDay(e.data)}
              value={brl(e.valor)}
              valueClass="text-destructive"
              onEdit={() => openEditEntry(e)}
              onDelete={() => setDeleteTarget({ kind: "entry", id: e.id, label: e.descricao })}
            />
          ))}
        </ListCard>
      </div>

      {/* ── MODAL CRIAR / EDITAR ── */}
      <Dialog open={!!form} onOpenChange={(open) => !open && !saving && setForm(null)}>
        <DialogContent>
          {form && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {form.editingId ? "Editar" : "Nova"} {FORM_TITLES[form.kind]}
                </DialogTitle>
                <DialogDescription>
                  {form.kind === "FIXA"
                    ? form.editingId
                      ? "A alteração vale para todos os meses em que a conta está ativa."
                      : `Passa a valer a partir de ${monthLabel(month)}, todo mês, até você encerrar.`
                    : "Lançamento avulso numa data específica."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fin-desc">Descrição</Label>
                  <Input
                    id="fin-desc"
                    autoFocus
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    placeholder={
                      form.kind === "ENTRADA"
                        ? "Ex: Comissão Hapvida — João"
                        : form.kind === "FIXA"
                          ? "Ex: Aluguel da sala"
                          : "Ex: Impulsionamento extra"
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fin-valor">Valor (R$)</Label>
                    <Input
                      id="fin-valor"
                      inputMode="decimal"
                      value={form.valor}
                      onChange={(e) => setForm({ ...form, valor: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                  {form.kind === "FIXA" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="fin-dia">Dia do vencimento</Label>
                      <Input
                        id="fin-dia"
                        type="number"
                        min={1}
                        max={31}
                        value={form.dia}
                        onChange={(e) => setForm({ ...form, dia: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="fin-data">Data</Label>
                      <Input
                        id="fin-data"
                        type="date"
                        value={form.data}
                        onChange={(e) => setForm({ ...form, data: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL EXCLUIR (senha) ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && closeDelete()}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              <DialogTitle>Excluir lançamento</DialogTitle>
            </div>
            <DialogDescription>
              Isso vai apagar permanentemente <strong>{deleteTarget?.label}</strong>
              {deleteTarget?.kind === "fixed" ? " de todos os meses, inclusive do histórico" : ""}.
              Essa ação não pode ser desfeita. Digite sua senha pra confirmar.
              {deleteTarget?.kind === "fixed" &&
                " Pra só parar de cobrar daqui pra frente, use “Encerrar”."}
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
            <Button variant="outline" onClick={closeDelete} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}

// ========================
// COMPONENTES
// ========================

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </div>
        <p
          className={`text-2xl font-bold tabular-nums ${
            tone === "positive" ? "text-emerald-600" : "text-destructive"
          }`}
        >
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  icon,
  total,
  onAdd,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  total: string;
  onAdd: () => void;
  empty: string;
  children: React.ReactNode;
}) {
  const hasItems = React.Children.count(children) > 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={onAdd}>
            <Plus className="size-3.5" />
            Novo
          </Button>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">Total: {total}</p>
      </CardHeader>
      <CardContent>
        {hasItems ? (
          <ul className="divide-y divide-border/60">{children}</ul>
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  title,
  subtitle,
  value,
  valueClass,
  onEdit,
  onDelete,
  extra,
}: {
  title: string;
  subtitle: string;
  value: string;
  valueClass: string;
  onEdit: () => void;
  onDelete: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <span className={`text-sm font-semibold tabular-nums mr-1 ${valueClass}`}>{value}</span>
        {extra}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          aria-label="Editar"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          aria-label="Excluir"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}
