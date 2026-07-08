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
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bell,
  BellOff,
  Phone,
  UserPlus,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";

type AlertConfig = {
  whatsappNumber: string | null;
  alertNovoLead: boolean;
};

export default function AlertasPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [config, setConfig] = React.useState<AlertConfig>({
    whatsappNumber: "",
    alertNovoLead: false,
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const authParams = React.useMemo(() => {
    if (!firebaseUser) return null;
    const p = new URLSearchParams();
    p.set("firebaseUid", firebaseUser.uid);
    p.set("email", firebaseUser.email ?? "");
    if (firebaseUser.displayName) p.set("name", firebaseUser.displayName);
    return p;
  }, [firebaseUser]);

  React.useEffect(() => {
    if (!authParams) return;
    setLoading(true);
    fetch(`/api/alertas/config?${authParams}`)
      .then((r) => r.json())
      .then((data: AlertConfig) =>
        setConfig({
          whatsappNumber: data.whatsappNumber ?? "",
          alertNovoLead: data.alertNovoLead,
        }),
      )
      .catch(() => toast.error("Erro ao carregar configurações de alertas"))
      .finally(() => setLoading(false));
  }, [authParams]);

  const handleSave = async () => {
    if (!authParams) return;

    const num = (config.whatsappNumber ?? "").replace(/\D/g, "");

    if (config.alertNovoLead && !num) {
      toast.error("Informe o número de WhatsApp para receber os alertas.");
      return;
    }

    if (num.startsWith("55") && num.length === 12) {
      toast.error(
        `Celular BR com 12 dígitos — falta o nono dígito após o DDD. Correto: 55${num.slice(2, 4)}9${num.slice(4)}`,
        { duration: 6000 },
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/alertas/config?${authParams}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: num || null,
          alertNovoLead: config.alertNovoLead,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Erro ao salvar");
      }

      toast.success("Configurações de alertas salvas!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loadingAuth) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!firebaseUser) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-base font-semibold">Você precisa estar logado.</p>
        </div>
      </Layout>
    );
  }

  const digits = (config.whatsappNumber ?? "").replace(/\D/g, "");
  const hasBrWarning = digits.startsWith("55") && digits.length === 12;
  const suggestedNumber = hasBrWarning
    ? `55${digits.slice(2, 4)}9${digits.slice(4)}`
    : null;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Bell className="h-3.5 w-3.5" />
            Configurações
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas via WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Receba notificações no seu WhatsApp para não perder nenhum lead.
          </p>
        </header>

        {/* Número de destino */}
        <Card className="border-muted-foreground/10">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Phone className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Número de destino
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Número que receberá as notificações ativadas abaixo.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp-number" className="text-sm font-medium">
                    WhatsApp (formato internacional)
                  </Label>
                  <Input
                    id="whatsapp-number"
                    placeholder="Ex: 5547996751564"
                    value={config.whatsappNumber ?? ""}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, whatsappNumber: e.target.value }))
                    }
                    className="font-mono"
                  />
                  {hasBrWarning && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Falta o nono dígito após o DDD. Correto:{" "}
                      <span className="font-mono font-medium">{suggestedNumber}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Código do país + DDD + número, só dígitos. Exemplo:{" "}
                    <span className="font-mono font-medium text-foreground">5547996751564</span>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Alerta de novo lead */}
        <Card
          className={`border transition-colors duration-200 ${
            config.alertNovoLead
              ? "border-primary/30 bg-primary/3"
              : "border-muted-foreground/10"
          }`}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  config.alertNovoLead ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <UserPlus
                  className={`h-5 w-5 transition-colors ${
                    config.alertNovoLead ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Novo lead cadastrado</p>
                  {loading ? (
                    <Skeleton className="h-5 w-9 rounded-full" />
                  ) : (
                    <Switch
                      checked={config.alertNovoLead}
                      onCheckedChange={(val) =>
                        setConfig((c) => ({ ...c, alertNovoLead: val }))
                      }
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Receba uma mensagem sempre que um lead for adicionado ao CRM.
                </p>
                <div className="mt-2 rounded-lg bg-muted/50 border border-border/50 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground font-medium mb-0.5 uppercase tracking-wider">
                    Exemplo de mensagem
                  </p>
                  <p className="text-xs text-foreground/80 font-mono leading-relaxed whitespace-pre-line">
                    {`🆕 Novo lead cadastrado!\n\n👤 João Silva\n📍 Joinville - SC\n📞 47999998888\n🏷️ Origem: Indicação`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status resumo */}
        {!loading && (
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
              config.alertNovoLead
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                : "border-muted-foreground/10 bg-muted/30 text-muted-foreground"
            }`}
          >
            {config.alertNovoLead ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <BellOff className="h-4 w-4 shrink-0" />
            )}
            <span>
              {config.alertNovoLead
                ? `Alerta ativo — notificações serão enviadas para ${config.whatsappNumber || "o número informado"}.`
                : "Alerta desativado. Ative o toggle acima para começar a receber notificações."}
            </span>
          </div>
        )}

        {/* Botão salvar */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving || loading} className="min-w-32">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              "Salvar configurações"
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
