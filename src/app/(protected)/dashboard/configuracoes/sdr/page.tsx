"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bot,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Trash2,
  ExternalLink,
  AlertCircle,
  Zap,
  BookOpen,
  Copy,
  Wifi,
  WifiOff,
} from "lucide-react";

type WhatsAppInstance = {
  id: string;
  senderId: string;
  phoneNumber: string | null;
  status: "connected" | "disconnected";
} | null;

type SdrConfig = {
  enabled: boolean;
  nomeAssistente: string;
  saudacao: string | null;
  tom: string;
  handoffMinCategoria: string;
  followupMaxTentativas: number;
};

const CATEGORIES = [
  { value: "A", label: "Quente", desc: "Pronto pra fechar", color: "#22c55e" },
  { value: "B", label: "Qualificado", desc: "Bom potencial", color: "#3b82f6" },
  { value: "C", label: "Morno", desc: "Vale o contato", color: "#eab308" },
] as const;

const ALL_CATEGORIES = [
  { v: "A", label: "Quente", color: "#22c55e" },
  { v: "B", label: "Qualificado", color: "#3b82f6" },
  { v: "C", label: "Morno", color: "#eab308" },
  { v: "D", label: "Frio", color: "#6b7280" },
  { v: "E", label: "Sem oferta", color: "#ef4444" },
];

export default function SdrConfigPage() {
  const [user, loadingAuth] = useAuthState(auth);

  const authParams = React.useMemo(() => {
    if (!user) return null;
    const p = new URLSearchParams();
    p.set("firebaseUid", user.uid);
    p.set("email", user.email ?? "");
    if (user.displayName) p.set("name", user.displayName);
    return p;
  }, [user]);

  const [instance, setInstance] = React.useState<WhatsAppInstance>(null);
  const [instanceLoading, setInstanceLoading] = React.useState(true);
  const [senderIdInput, setSenderIdInput] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  const [config, setConfig] = React.useState<SdrConfig>({
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
    if (!authParams) return;
    try {
      const res = await fetch(`/api/whatsapp/instances?${authParams}`);
      const data = await res.json();
      setInstance(data.instance);
    } catch { /* silencioso */ }
    finally { setInstanceLoading(false); }
  }, [authParams]);

  const fetchConfig = React.useCallback(async () => {
    if (!authParams) return;
    try {
      const res = await fetch(`/api/sdr/config?${authParams}`);
      const data = await res.json();
      if (data.config) setConfig(data.config);
    } catch { toast.error("Erro ao carregar configurações do SDR"); }
    finally { setConfigLoading(false); }
  }, [authParams]);

  React.useEffect(() => {
    if (!authParams) return;
    fetchInstance();
    fetchConfig();
  }, [authParams, fetchInstance, fetchConfig]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!authParams || !senderIdInput.trim()) return;
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
    if (!authParams) return;
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
    if (!authParams) return;
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

  if (loadingAuth) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-56 rounded-2xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const isConnected = instance?.status === "connected";
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/zavu`
      : "https://seudominio.com/api/webhooks/zavu";

  return (
    <Layout>
      <div className="relative">
        {/* Ambient blobs — igual ao dashboard */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[360px] -z-10 overflow-hidden">
          <div className="absolute -top-24 left-1/4 h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -top-32 right-1/4 h-[360px] w-[360px] rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute top-10 left-10 h-60 w-60 rounded-full bg-primary/6 blur-3xl" />
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

          {/* ── Page header ─────────────────────────────────────────────── */}
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {isConnected && config.enabled ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                    </span>
                    <span className="uppercase tracking-wider">SDR ativo</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    <span className="uppercase tracking-wider">SDR de IA</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Assistente Virtual
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl">
                Qualifica leads pelo WhatsApp automaticamente antes de passar ao corretor.
              </p>
            </div>

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
            </div>
          </header>

          {/* ── Grid ────────────────────────────────────────────────────── */}
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
                        disabled={!isConnected}
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
                        className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
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
                        {ALL_CATEGORIES.map(({ v, label, color }) => (
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
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(({ value, label, desc, color }) => (
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

                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Salvar configurações
                    </Button>
                  </form>
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
                    </div>
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

            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>
    </Layout>
  );
}
