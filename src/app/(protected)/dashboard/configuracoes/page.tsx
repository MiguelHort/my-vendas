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
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { OPERADORAS } from "@/components/LeadCard";
import { MODALIDADES } from "@/lib/commissions";

type CommissionRow = {
  id: string;
  operadora: string;
  modalidade: string;
  percentual: number;
};

type Profile = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  role: "ADMIN" | "VENDEDOR";
  mark_read_on_open: boolean;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Aba Comissões — percentual por operadora × modalidade ───────────────────

function commissionKey(operadora: string, modalidade: string) {
  return `${operadora}|${modalidade}`;
}

function CommissionsTab({ authParams, readOnly }: { authParams: URLSearchParams; readOnly: boolean }) {
  const [loading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const debouncedDraft = useDebounce(draft, 600);
  const savedRef = React.useRef<Record<string, number>>({});

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/configuracoes/comissoes?${authParams}`)
      .then((r) => r.json())
      .then((data: CommissionRow[]) => {
        const initial: Record<string, string> = {};
        const saved: Record<string, number> = {};
        data.forEach((r) => {
          const key = commissionKey(r.operadora, r.modalidade);
          initial[key] = String(r.percentual);
          saved[key] = r.percentual;
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
    for (const key of Object.keys(debouncedDraft)) {
      const percentual = parseFloat(debouncedDraft[key]);
      if (isNaN(percentual)) continue;
      if (savedRef.current[key] === percentual) continue;
      const [operadora, modalidade] = key.split("|");
      fetch(`/api/configuracoes/comissoes?${authParams}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operadora, modalidade, percentual }),
      })
        .then((r) => r.json())
        .then((updated: CommissionRow) => {
          savedRef.current[key] = updated.percentual;
        })
        .catch(() => toast.error(`Erro ao salvar ${operadora} · ${modalidade}`));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft]);

  const setField = (operadora: string, modalidade: string, value: string) => {
    setDraft((prev) => ({ ...prev, [commissionKey(operadora, modalidade)]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  const gridTemplate = `1fr repeat(${MODALIDADES.length}, 6rem)`;

  return (
    <>
      <div className="overflow-x-auto">
        <div className="rounded-2xl border overflow-hidden shadow-sm min-w-[560px]">
          <div
            className="grid gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <span>Operadora</span>
            {MODALIDADES.map((m) => (
              <span key={m} className="text-center">{m}</span>
            ))}
          </div>

          {OPERADORAS.map((op, i) => (
            <div
              key={op.nome}
              className={`grid gap-4 items-center px-4 py-3 ${
                i !== OPERADORAS.length - 1 ? "border-b" : ""
              }`}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {op.logo ? (
                  <Image
                    src={op.logo}
                    alt={op.nome}
                    width={80}
                    height={24}
                    className="h-6 w-auto object-contain shrink-0"
                  />
                ) : (
                  <span className="text-sm font-medium truncate" style={{ color: op.cor }}>
                    {op.nome}
                  </span>
                )}
              </div>
              {MODALIDADES.map((modalidade) => {
                const key = commissionKey(op.nome, modalidade);
                const value = draft[key] ?? "100";
                return (
                  <div key={modalidade} className="relative w-24">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={value}
                      onChange={(e) => setField(op.nome, modalidade, e.target.value)}
                      disabled={readOnly}
                      className="pr-6 text-sm text-right rounded-xl h-9 disabled:opacity-80"
                    />
                    <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground text-right">
        {readOnly
          ? "Somente administradores podem editar as comissões."
          : "Salvo automaticamente ao digitar"}
      </p>
    </>
  );
}

// ─── Aba Minha Conta ──────────────────────────────────────────────────────────

function MyAccountTab({ token }: { token: string }) {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [savingMarkReadOnOpen, setSavingMarkReadOnOpen] = React.useState(false);

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

  const handleToggleMarkReadOnOpen = async (checked: boolean) => {
    setSavingMarkReadOnOpen(true);
    const previous = profile?.mark_read_on_open;
    setProfile((p) => (p ? { ...p, mark_read_on_open: checked } : p));
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ mark_read_on_open: checked }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
    } catch {
      setProfile((p) => (p ? { ...p, mark_read_on_open: previous ?? true } : p));
      toast.error("Erro ao salvar preferência.");
    } finally {
      setSavingMarkReadOnOpen(false);
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

      {/* Preferências */}
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Preferências
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="mark-read-on-open" className="text-sm font-medium">
                Marcar como lida ao abrir a conversa
              </Label>
              <p className="text-xs text-muted-foreground max-w-md">
                Com isso desligado, abrir uma conversa no WhatsApp não zera o contador de
                não lidas dela — vale só pra sua sessão; se outra pessoa da equipe abrir a
                mesma conversa com a opção ligada, o contador zera do mesmo jeito.
              </p>
            </div>
            <Switch
              id="mark-read-on-open"
              checked={profile.mark_read_on_open}
              disabled={savingMarkReadOnOpen}
              onCheckedChange={handleToggleMarkReadOnOpen}
            />
          </div>
        </div>
      </div>

      {/* Exportar dados */}
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Exportar meus dados (LGPD)
        </div>
        <div className="px-4 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Baixe uma cópia completa dos seus dados de perfil em formato JSON.
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
                  Todos os seus dados de perfil serão removidos definitivamente. Esta ação não
                  pode ser desfeita. Leads e comissões são compartilhados pela equipe e não são
                  afetados.
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
            <TabsTrigger value="minha-conta" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Minha conta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comissoes">
            <p className="text-sm text-muted-foreground mb-6">
              {isAdmin
                ? "Defina o percentual de comissão de cada operadora por modalidade. As alterações são salvas automaticamente."
                : "Percentual de comissão de cada operadora por modalidade."}
            </p>
            {authParams && <CommissionsTab authParams={authParams} readOnly={!isAdmin} />}
          </TabsContent>

          <TabsContent value="minha-conta">
            <MyAccountTab token={token} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
