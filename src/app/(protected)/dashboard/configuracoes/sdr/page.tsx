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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Trash2,
  ExternalLink,
  AlertCircle,
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

  // ── Zavu Sender ───────────────────────────────────────────────────────────
  const [instance, setInstance] = React.useState<WhatsAppInstance>(null);
  const [instanceLoading, setInstanceLoading] = React.useState(true);
  const [senderIdInput, setSenderIdInput] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  // ── SDR Config ────────────────────────────────────────────────────────────
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
    } catch {
      // silencioso
    } finally {
      setInstanceLoading(false);
    }
  }, [authParams]);

  const fetchConfig = React.useCallback(async () => {
    if (!authParams) return;
    try {
      const res = await fetch(`/api/sdr/config?${authParams}`);
      const data = await res.json();
      if (data.config) setConfig(data.config);
    } catch {
      toast.error("Erro ao carregar configurações do SDR");
    } finally {
      setConfigLoading(false);
    }
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
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao conectar sender");
        return;
      }
      toast.success("Sender Zavu conectado com sucesso!");
      setSenderIdInput("");
      await fetchInstance();
    } catch {
      toast.error("Erro ao conectar sender");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!authParams) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/whatsapp/instances?${authParams}`, { method: "DELETE" });
      setInstance(null);
      toast.success("Sender desconectado");
    } catch {
      toast.error("Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
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
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  if (loadingAuth) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  const isConnected = instance?.status === "connected";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <Bot className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">SDR de IA</h1>
            <p className="text-sm text-muted-foreground">
              Assistente virtual que qualifica leads pelo WhatsApp via Zavu
            </p>
          </div>
        </div>

        {/* ── Sender Zavu ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4" />
              Número WhatsApp (Zavu Sender)
            </CardTitle>
            <CardDescription>
              Informe o Sender ID do seu número no painel da Zavu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {instanceLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : instance ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">
                        {instance.phoneNumber ?? instance.senderId}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {instance.senderId}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      isConnected
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-600"
                    }
                  >
                    {isConnected ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Remover sender
                </Button>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex gap-2 text-sm text-blue-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Encontre o Sender ID no seu painel em{" "}
                    <a
                      href="https://app.zavu.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline inline-flex items-center gap-1"
                    >
                      app.zavu.dev
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {" "}→ Senders → copie o ID (ex: snd_abc123).
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="senderId">Sender ID *</Label>
                  <Input
                    id="senderId"
                    value={senderIdInput}
                    onChange={(e) => setSenderIdInput(e.target.value)}
                    placeholder="Ex: snd_abc1234567"
                    required
                  />
                </div>

                <Button type="submit" disabled={connecting || !senderIdInput.trim()}>
                  {connecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Conectar sender
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ── Config SDR ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-4 h-4" />
              Configurações do Assistente
            </CardTitle>
            <CardDescription>
              Personalize o comportamento do SDR e as regras de handoff
            </CardDescription>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-2/3" />
              </div>
            ) : (
              <form onSubmit={handleSaveConfig} className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">SDR ativo</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      O assistente responderá automaticamente aos leads no WhatsApp
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
                    disabled={!isConnected}
                  />
                </div>

                {!isConnected && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                    Conecte um Sender Zavu primeiro para ativar o SDR.
                  </p>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="nomeAssistente">Nome do assistente</Label>
                  <Input
                    id="nomeAssistente"
                    value={config.nomeAssistente}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, nomeAssistente: e.target.value }))
                    }
                    placeholder="Ex: Ana, Leo, Assistente..."
                    maxLength={50}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="saudacao">
                    Saudação inicial{" "}
                    <span className="text-muted-foreground font-normal text-xs">
                      (opcional)
                    </span>
                  </Label>
                  <textarea
                    id="saudacao"
                    className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={config.saudacao ?? ""}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, saudacao: e.target.value || null }))
                    }
                    placeholder="Deixe vazio para usar a saudação padrão do SDR"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="handoffMin">Notificar corretor a partir da categoria</Label>
                  <Select
                    value={config.handoffMinCategoria}
                    onValueChange={(v) =>
                      setConfig((c) => ({ ...c, handoffMinCategoria: v }))
                    }
                  >
                    <SelectTrigger id="handoffMin">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">
                        <span className="flex items-center gap-2">
                          <Badge className="bg-green-600 text-white text-xs">A</Badge>
                          Quente — pronto pra fechar
                        </span>
                      </SelectItem>
                      <SelectItem value="B">
                        <span className="flex items-center gap-2">
                          <Badge className="bg-blue-600 text-white text-xs">B</Badge>
                          Qualificado — bom potencial
                        </span>
                      </SelectItem>
                      <SelectItem value="C">
                        <span className="flex items-center gap-2">
                          <Badge className="bg-yellow-500 text-white text-xs">C</Badge>
                          Morno — vale o contato
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Leads nessa categoria ou melhor acionam notificação imediata ao corretor.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="followup">
                    Follow-ups sem resposta antes de arquivar
                  </Label>
                  <Select
                    value={String(config.followupMaxTentativas)}
                    onValueChange={(v) =>
                      setConfig((c) => ({ ...c, followupMaxTentativas: Number(v) }))
                    }
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
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar configurações
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ── Instruções de setup ───────────────────────────────────────────── */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Como configurar o webhook na Zavu
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>1. Acesse <strong>app.zavu.dev → Settings → Webhooks</strong></p>
            <p>2. Adicione o endpoint:</p>
            <code className="block bg-muted rounded p-2 font-mono break-all">
              {typeof window !== "undefined" ? window.location.origin : "https://seudominio.com"}
              /api/webhooks/zavu
            </code>
            <p>3. Inscreva no evento: <strong>message.inbound</strong> e <strong>conversation.new</strong></p>
            <p>4. Copie o <strong>Webhook Secret</strong> e adicione no <code className="font-mono">.env</code> como <code className="font-mono">ZAVU_WEBHOOK_SECRET</code></p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
