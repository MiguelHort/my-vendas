"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { getIdToken, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Percent,
  AlertCircle,
  Download,
  Trash2,
  User,
  Bot,
  MessageSquare,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Zap,
  BookOpen,
  Copy,
  Wifi,
  WifiOff,
} from "lucide-react";
import Image from "next/image";
import { OPERADORAS } from "@/components/LeadCard";

type CommissionRow = {
  id: string;
  operadora: string;
  comissao_interna: number;
  comissao_externa: number;
};

type Profile = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  role: "ADMIN" | "VENDEDOR";
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Aba Comissões (conteúdo original) ───────────────────────────────────────

function CommissionsTab({ authParams, readOnly }: { authParams: URLSearchParams; readOnly: boolean }) {
  const [rows, setRows] = React.useState<CommissionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState<
    Record<string, { interna: string; externa: string }>
  >({});
  const debouncedDraft = useDebounce(draft, 600);
  const savedRef = React.useRef<Record<string, { interna: number; externa: number }>>({});

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/configuracoes/comissoes?${authParams}`)
      .then((r) => r.json())
      .then((data: CommissionRow[]) => {
        setRows(data);
        const initial: Record<string, { interna: string; externa: string }> = {};
        const saved: Record<string, { interna: number; externa: number }> = {};
        data.forEach((r) => {
          initial[r.operadora] = {
            interna: String(r.comissao_interna),
            externa: String(r.comissao_externa),
          };
          saved[r.operadora] = {
            interna: r.comissao_interna,
            externa: r.comissao_externa,
          };
        });
        setDraft(initial);
        savedRef.current = saved;
      })
      .catch(() => toast.error("Erro ao carregar comissões"))
      .finally(() => setLoading(false));
  }, [authParams]);

  React.useEffect(() => {
    if (readOnly) return;
    if (Object.keys(debouncedDraft).length === 0) return;
    for (const operadora of Object.keys(debouncedDraft)) {
      const d = debouncedDraft[operadora];
      const interna = parseFloat(d.interna);
      const externa = parseFloat(d.externa);
      if (isNaN(interna) || isNaN(externa)) continue;
      const prev = savedRef.current[operadora];
      if (prev && prev.interna === interna && prev.externa === externa) continue;
      fetch(`/api/configuracoes/comissoes?${authParams}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operadora, comissao_interna: interna, comissao_externa: externa }),
      })
        .then((r) => r.json())
        .then((updated: CommissionRow) => {
          savedRef.current[operadora] = {
            interna: updated.comissao_interna,
            externa: updated.comissao_externa,
          };
          setRows((prev) =>
            prev.map((r) => (r.operadora === operadora ? updated : r))
          );
        })
        .catch(() => toast.error(`Erro ao salvar ${operadora}`));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft]);

  const setField = (operadora: string, field: "interna" | "externa", value: string) => {
    setDraft((prev) => ({
      ...prev,
      [operadora]: { ...prev[operadora], [field]: value },
    }));
  };

  const displayRows = OPERADORAS.map((op) => {
    const found = rows.find((r) => r.operadora === op.nome);
    return {
      operadora: op.nome,
      logo: op.logo,
      comissao_interna: found?.comissao_interna ?? 100,
      comissao_externa: found?.comissao_externa ?? 100,
    };
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Operadora</span>
          <span className="w-28 text-center">Interna (%)</span>
          <span className="w-28 text-center">Externa (%)</span>
        </div>

        {displayRows.map((row, i) => {
          const d = draft[row.operadora] ?? {
            interna: String(row.comissao_interna),
            externa: String(row.comissao_externa),
          };
          return (
            <div
              key={row.operadora}
              className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3 ${
                i !== displayRows.length - 1 ? "border-b" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Image
                  src={row.logo}
                  alt={row.operadora}
                  width={80}
                  height={24}
                  className="h-6 w-auto object-contain shrink-0"
                />
              </div>
              <div className="relative w-28">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={d.interna}
                  onChange={(e) => setField(row.operadora, "interna", e.target.value)}
                  disabled={readOnly}
                  className="pr-7 text-sm text-right rounded-xl h-9 disabled:opacity-80"
                />
                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative w-28">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={d.externa}
                  onChange={(e) => setField(row.operadora, "externa", e.target.value)}
                  disabled={readOnly}
                  className="pr-7 text-sm text-right rounded-xl h-9 disabled:opacity-80"
                />
                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground text-right">
        {readOnly
          ? "Somente administradores podem editar as comissões."
          : "Salvo automaticamente ao digitar"}
      </p>
    </>
  );
}

// ─── Aba SDR ──────────────────────────────────────────────────────────────────

type WhatsAppInstance = {
  id: string;
  senderId: string;
  phoneNumber: string | null;
  status: "connected" | "disconnected";
} | null;

type SdrConfigData = {
  enabled: boolean;
  nomeAssistente: string;
  saudacao: string | null;
  tom: string;
  handoffMinCategoria: string;
  followupMaxTentativas: number;
};

const SDR_CATEGORIES = [
  { value: "A", label: "Quente", desc: "Pronto pra fechar", color: "#22c55e" },
  { value: "B", label: "Qualificado", desc: "Bom potencial", color: "#3b82f6" },
  { value: "C", label: "Morno", desc: "Vale o contato", color: "#eab308" },
] as const;

const SDR_ALL_CATEGORIES = [
  { v: "A", label: "Quente", color: "#22c55e" },
  { v: "B", label: "Qualificado", color: "#3b82f6" },
  { v: "C", label: "Morno", color: "#eab308" },
  { v: "D", label: "Frio", color: "#6b7280" },
  { v: "E", label: "Sem oferta", color: "#ef4444" },
];

function SdrTab({ authParams, readOnly }: { authParams: URLSearchParams; readOnly: boolean }) {
  const [instance, setInstance] = React.useState<WhatsAppInstance>(null);
  const [instanceLoading, setInstanceLoading] = React.useState(true);
  const [senderIdInput, setSenderIdInput] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  const [config, setConfig] = React.useState<SdrConfigData>({
    enabled: false,
    nomeAssistente: "Assistente",
    saudacao: null,
    tom: "formal",
    handoffMinCategoria: "B",
    followupMaxTentativas: 3,
  });
  const [configLoading, setConfigLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const fetchInstance = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/instances?${authParams}`);
      const data = await res.json();
      setInstance(data.instance);
    } catch { /* silencioso */ }
    finally { setInstanceLoading(false); }
  }, [authParams]);

  const fetchConfig = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/sdr/config?${authParams}`);
      const data = await res.json();
      if (data.config) setConfig(data.config);
    } catch { toast.error("Erro ao carregar configurações do SDR"); }
    finally { setConfigLoading(false); }
  }, [authParams]);

  React.useEffect(() => {
    fetchInstance();
    fetchConfig();
  }, [fetchInstance, fetchConfig]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!senderIdInput.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch(`/api/whatsapp/instances?${authParams}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: senderIdInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao conectar sender"); return; }
      toast.success("Sender Zavu conectado!");
      setSenderIdInput("");
      await fetchInstance();
    } catch { toast.error("Erro ao conectar sender"); }
    finally { setConnecting(false); }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch(`/api/whatsapp/instances?${authParams}`, { method: "DELETE" });
      setInstance(null);
      toast.success("Sender desconectado");
    } catch { toast.error("Erro ao desconectar"); }
    finally { setDisconnecting(false); }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/sdr/config?${authParams}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();
      toast.success("Configurações salvas");
    } catch { toast.error("Erro ao salvar configurações"); }
    finally { setSaving(false); }
  }

  const isConnected = instance?.status === "connected";
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/zavu`
      : "https://seudominio.com/api/webhooks/zavu";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <div className={`inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-3 py-1.5 text-xs font-medium shadow-sm ${
          isConnected
            ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            : "text-muted-foreground"
        }`}>
          {isConnected
            ? <CheckCircle2 className="h-3.5 w-3.5" />
            : <WifiOff className="h-3.5 w-3.5" />
          }
          {instanceLoading ? "Verificando…" : isConnected ? "WhatsApp conectado" : "Sem WhatsApp"}
        </div>

        {!instanceLoading && isConnected && (
          <div className={`inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-3 py-1.5 text-xs font-medium shadow-sm ${
            config.enabled
              ? "text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
              : "text-muted-foreground"
          }`}>
            <Zap className={`h-3.5 w-3.5 ${config.enabled ? "fill-indigo-500 text-indigo-500" : ""}`} />
            {config.enabled ? "Respondendo leads" : "SDR pausado"}
          </div>
        )}

        {readOnly && (
          <span className="text-xs text-muted-foreground">
            Somente administradores podem editar o SDR.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* ── Coluna principal: Configurações ───────────────────────── */}
        <Card className="lg:col-span-2 border-muted-foreground/10 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20 flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Configurações do Assistente
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Personalize o comportamento e as regras de handoff
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {configLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-2/3" />
              </div>
            ) : (
              <fieldset disabled={readOnly} className="contents">
                <form onSubmit={handleSaveConfig} className="space-y-6">
                  {/* Toggle */}
                  <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                    config.enabled
                      ? "border-indigo-200 bg-indigo-500/5 dark:border-indigo-800"
                      : "border-border bg-muted/20"
                  }`}>
                    <div>
                      <p className="text-sm font-medium">SDR ativo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isConnected
                          ? "Responde automaticamente no WhatsApp"
                          : "Conecte um número WhatsApp primeiro"}
                      </p>
                    </div>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
                      disabled={readOnly || !isConnected}
                    />
                  </div>

                  {/* Identidade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="nomeAssistente">Nome do assistente</Label>
                      <Input
                        id="nomeAssistente"
                        value={config.nomeAssistente}
                        onChange={(e) => setConfig((c) => ({ ...c, nomeAssistente: e.target.value }))}
                        placeholder="Ex: Ana, Leo, Assistente…"
                        maxLength={50}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Aparece nas mensagens enviadas ao lead.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="followup">Follow-ups antes de arquivar</Label>
                      <Select
                        value={String(config.followupMaxTentativas)}
                        onValueChange={(v) => setConfig((c) => ({ ...c, followupMaxTentativas: Number(v) }))}
                        disabled={readOnly}
                      >
                        <SelectTrigger id="followup">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {n === 1 ? "tentativa" : "tentativas"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Sem resposta após esse número → arquiva.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="saudacao">
                      Saudação inicial{" "}
                      <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                    </Label>
                    <textarea
                      id="saudacao"
                      className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none disabled:opacity-80"
                      value={config.saudacao ?? ""}
                      onChange={(e) => setConfig((c) => ({ ...c, saudacao: e.target.value || null }))}
                      placeholder="Deixe vazio para usar a saudação padrão do SDR"
                    />
                  </div>

                  {/* Handoff */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                        Regra de Handoff
                      </h3>
                    </div>

                    {/* Legenda A–E */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {SDR_ALL_CATEGORIES.map(({ v, label, color }) => (
                        <span key={v} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className="inline-flex w-5 h-5 items-center justify-center rounded text-white text-[10px] font-bold"
                            style={{ backgroundColor: color }}
                          >
                            {v}
                          </span>
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Notificar corretor a partir da categoria</Label>
                      <Select
                        value={config.handoffMinCategoria}
                        onValueChange={(v) => setConfig((c) => ({ ...c, handoffMinCategoria: v }))}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SDR_CATEGORIES.map(({ value, label, desc, color }) => (
                            <SelectItem key={value} value={value}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="inline-flex w-5 h-5 items-center justify-center rounded text-white text-[10px] font-bold"
                                  style={{ backgroundColor: color }}
                                >
                                  {value}
                                </span>
                                <span className="font-medium">{label}</span>
                                <span className="text-muted-foreground text-xs">— {desc}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Leads nessa categoria ou melhor acionam notificação imediata.
                      </p>
                    </div>
                  </div>

                  {!readOnly && (
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Salvar configurações
                    </Button>
                  )}
                </form>
              </fieldset>
            )}
          </CardContent>
        </Card>

        {/* ── Coluna lateral ────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Sender */}
          <Card className="border-muted-foreground/10 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ${
                  isConnected
                    ? "bg-emerald-500/10 ring-emerald-500/20"
                    : "bg-muted ring-border"
                }`}>
                  {isConnected
                    ? <Wifi className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    : <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  }
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">
                    Número WhatsApp
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Zavu Sender
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {instanceLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-8 w-28" />
                </div>
              ) : instance ? (
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${
                    isConnected
                      ? "border-emerald-200 bg-emerald-500/5 dark:border-emerald-800"
                      : "border-border bg-muted/30"
                  }`}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {instance.phoneNumber ?? instance.senderId}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                        {instance.senderId}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`ml-2 shrink-0 text-[10px] ${isConnected
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isConnected ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  {!readOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      {disconnecting
                        ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        : <Trash2 className="w-4 h-4 mr-2" />
                      }
                      Remover sender
                    </Button>
                  )}
                </div>
              ) : readOnly ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum número conectado ainda.
                </p>
              ) : (
                <form onSubmit={handleConnect} className="space-y-3">
                  <div className="rounded-xl border border-blue-200 bg-blue-500/5 dark:border-blue-800 p-3 flex gap-2 text-xs text-blue-700 dark:text-blue-300">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      Encontre o ID em{" "}
                      <a
                        href="https://app.zavu.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium inline-flex items-center gap-0.5"
                      >
                        app.zavu.dev
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      {" "}→ Senders
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="senderId" className="text-xs">Sender ID</Label>
                    <Input
                      id="senderId"
                      value={senderIdInput}
                      onChange={(e) => setSenderIdInput(e.target.value)}
                      placeholder="snd_abc1234567"
                      className="text-sm"
                      required
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={connecting || !senderIdInput.trim()} className="w-full">
                    {connecting
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      : <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    }
                    Conectar
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Webhook */}
          {!readOnly && (
            <Card className="border-muted-foreground/10 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold tracking-tight">
                      Webhook Zavu
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configuração do endpoint
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                <div className="space-y-3 text-xs">
                  {[
                    {
                      n: 1,
                      content: (
                        <span className="text-muted-foreground">
                          Acesse{" "}
                          <a
                            href="https://app.zavu.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground font-medium underline inline-flex items-center gap-0.5"
                          >
                            app.zavu.dev
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          {" "}→ <strong className="text-foreground">Settings → Webhooks</strong>
                        </span>
                      ),
                    },
                    {
                      n: 2,
                      content: (
                        <div className="flex-1 space-y-1.5">
                          <span className="text-muted-foreground">Endpoint:</span>
                          <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-2">
                            <code className="text-[10px] font-mono flex-1 break-all text-foreground">
                              {webhookUrl}
                            </code>
                            <button
                              type="button"
                              onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada!"); }}
                              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              title="Copiar"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ),
                    },
                    {
                      n: 3,
                      content: (
                        <span className="text-muted-foreground">
                          Eventos:{" "}
                          <code className="bg-muted px-1 py-0.5 rounded font-mono text-foreground">message.inbound</code>
                          {" "}e{" "}
                          <code className="bg-muted px-1 py-0.5 rounded font-mono text-foreground">conversation.new</code>
                        </span>
                      ),
                    },
                    {
                      n: 4,
                      content: (
                        <span className="text-muted-foreground">
                          Webhook Secret → Vercel:{" "}
                          <code className="bg-muted px-1 py-0.5 rounded font-mono text-foreground">ZAVU_WEBHOOK_SECRET</code>
                        </span>
                      ),
                    },
                  ].map(({ n, content }) => (
                    <div key={n} className="flex gap-2.5">
                      <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                        {n}
                      </span>
                      <div className="flex-1 pt-0.5">{content}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Aba Minha Conta ──────────────────────────────────────────────────────────

function MyAccountTab({ token }: { token: string }) {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const headers = React.useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  React.useEffect(() => {
    fetch("/api/me/profile", { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setProfile(data.profile);
          setName(data.profile.name ?? "");
        }
      })
      .catch(() => toast.error("Erro ao carregar perfil"))
      .finally(() => setLoading(false));
  }, [headers]);

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.ok) {
        setProfile((p) => p ? { ...p, name: data.profile.name } : p);
        toast.success("Nome atualizado.");
      } else {
        toast.error(data.message ?? "Erro ao salvar.");
      }
    } catch {
      toast.error("Erro ao salvar nome.");
    } finally {
      setSavingName(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/me/export", { headers });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-winleads-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao exportar dados.");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/me/account", { method: "DELETE", headers });
      if (res.ok) {
        await signOut(auth);
        window.location.href = "/";
      } else {
        toast.error("Erro ao excluir conta. Tente novamente.");
      }
    } catch {
      toast.error("Erro ao excluir conta.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Não foi possível carregar o perfil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dados da conta */}
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Dados da conta
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-[120px_1fr] items-center gap-2 text-sm">
            <span className="text-muted-foreground">E-mail</span>
            <span className="font-medium">{profile.email}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2 text-sm">
            <span className="text-muted-foreground">Membro desde</span>
            <span className="font-medium">
              {new Date(profile.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-2 text-sm">
            <span className="text-muted-foreground">Cargo</span>
            <span className="font-medium">
              {profile.role === "ADMIN" ? "Admin" : "Vendedor"}
            </span>
          </div>
        </div>
      </div>

      {/* Editar nome */}
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Editar cadastro
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Nome</label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="rounded-xl h-9"
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={savingName || name === profile.name}
                className="shrink-0"
              >
                {savingName ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O e-mail é gerenciado pela sua conta Google e não pode ser alterado aqui.
          </p>
        </div>
      </div>

      {/* Exportar dados */}
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Exportar meus dados (LGPD)
        </div>
        <div className="px-4 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Baixe uma cópia completa de todos os seus dados em formato JSON — leads, lotes de produção e comissões.
          </p>
          <Button variant="outline" size="sm" onClick={handleExport} className="shrink-0 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Excluir conta */}
      <div className="rounded-2xl border border-destructive/30 overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-destructive/5 border-b border-destructive/20 text-xs font-semibold text-destructive uppercase tracking-wide">
          Zona de perigo
        </div>
        <div className="px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Excluir minha conta</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Remove permanentemente sua conta e todos os dados associados. Esta ação é irreversível.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="shrink-0 gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Excluir conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos os seus dados — leads, lotes de produção e configurações —
                  serão removidos definitivamente. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Excluindo..." : "Sim, excluir minha conta"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);
  const [token, setToken] = React.useState<string | null>(null);
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!firebaseUser) return;
    getIdToken(firebaseUser).then(setToken).catch(() => null);
  }, [firebaseUser]);

  React.useEffect(() => {
    if (!token) return;
    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setIsAdmin(data?.user?.role === "ADMIN"))
      .catch(() => setIsAdmin(false));
  }, [token]);

  const authParams = React.useMemo(() => {
    if (!firebaseUser) return null;
    return new URLSearchParams({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "",
    });
  }, [firebaseUser]);

  if (loadingAuth || !token || isAdmin === null) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!firebaseUser) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Você precisa estar logado.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Settings className="h-3.5 w-3.5" />
            Configurações
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        </div>

        <Tabs defaultValue="comissoes">
          <TabsList className="mb-6">
            <TabsTrigger value="comissoes" className="gap-1.5">
              <Percent className="h-3.5 w-3.5" />
              Comissões
            </TabsTrigger>
            <TabsTrigger value="sdr" className="gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              SDR
            </TabsTrigger>
            <TabsTrigger value="minha-conta" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Minha conta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comissoes">
            <p className="text-sm text-muted-foreground mb-6">
              {isAdmin
                ? "Defina as porcentagens de comissão interna e externa para cada operadora. As alterações são salvas automaticamente."
                : "Porcentagens de comissão interna e externa definidas para cada operadora."}
            </p>
            {authParams && <CommissionsTab authParams={authParams} readOnly={!isAdmin} />}
          </TabsContent>

          <TabsContent value="sdr">
            <p className="text-sm text-muted-foreground mb-6">
              {isAdmin
                ? "Configure o assistente de IA que qualifica leads automaticamente pelo WhatsApp."
                : "Configuração atual do assistente de IA que qualifica leads pelo WhatsApp."}
            </p>
            {authParams && <SdrTab authParams={authParams} readOnly={!isAdmin} />}
          </TabsContent>

          <TabsContent value="minha-conta">
            <MyAccountTab token={token} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
