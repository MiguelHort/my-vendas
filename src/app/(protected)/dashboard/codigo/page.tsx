"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Users,
  XCircle,
} from "lucide-react";

type LinkStatus = "PENDING" | "ACTIVE" | "REJECTED";

type Link = {
  id: string;
  status: LinkStatus;
  removedAt: string | null;
  supervisor: {
    id: string;
    name: string | null;
    email: string;
    supervisorCode: string | null;
  };
};

const STATUS_CONFIG: Record<LinkStatus, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING: {
    label: "Pendente",
    cls: "ring-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: Clock,
  },
  ACTIVE: {
    label: "Ativo",
    cls: "ring-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Negado",
    cls: "ring-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    icon: XCircle,
  },
};

export default function JoinTeamPage() {
  const [user, loading] = useAuthState(auth);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<Link | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function authedFetch(input: RequestInfo, init?: RequestInit) {
    if (!user) throw new Error("Não autenticado");
    const token = await user.getIdToken();
    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
    });
  }

  async function loadStatus() {
    setError(null);
    try {
      const res = await authedFetch("/api/team/join");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      setLink(data.link || null);
    } catch (e: any) {
      setError(e.message || "Erro");
    }
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/team/join", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      setLink(data.link);
      setCode("");
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/team/join", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      await loadStatus();
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!loading && user) loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (loading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-56 rounded-xl" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </Layout>
    );
  }

  const statusCfg = link ? STATUS_CONFIG[link.status] : null;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            Entrar em uma equipe
          </h1>
          <p className="text-muted-foreground mt-1">
            Solicite entrada na equipe de um supervisor usando o código fornecido.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Card className="border-muted-foreground/10 shadow-sm max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle>Vínculo de equipe</CardTitle>
                <CardDescription>
                  {!link || link.removedAt
                    ? "Digite o código para solicitar entrada"
                    : `Supervisor: ${link.supervisor.name || link.supervisor.email}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!link || link.removedAt ? (
              /* ---- form de entrada ---- */
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Peça o código ao seu supervisor e cole abaixo para enviar a solicitação.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="CÓDIGO"
                    className="max-w-[200px] font-mono tracking-widest uppercase"
                  />
                  <Button disabled={busy || !code.trim()} onClick={join}>
                    <Send className="h-4 w-4 mr-2" />
                    Solicitar
                  </Button>
                </div>
              </div>
            ) : (
              /* ---- status atual ---- */
              <div className="space-y-4">
                {/* Status pill */}
                {statusCfg && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full ring-1 px-3 py-1 text-xs font-semibold ${statusCfg.cls}`}
                    >
                      <statusCfg.icon className="h-3.5 w-3.5" />
                      {statusCfg.label}
                    </span>
                  </div>
                )}

                {/* Supervisor info */}
                <div className="rounded-xl border border-muted-foreground/10 bg-muted/20 px-4 py-3 text-sm space-y-0.5">
                  <p className="font-medium">
                    {link.supervisor.name || "Sem nome"}
                  </p>
                  <p className="text-muted-foreground">{link.supervisor.email}</p>
                </div>

                {/* PENDING: cancelar */}
                {link.status === "PENDING" && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Aguardando aprovação do supervisor.
                    </p>
                    <Button
                      disabled={busy}
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={cancel}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar solicitação
                    </Button>
                  </div>
                )}

                {/* ACTIVE */}
                {link.status === "ACTIVE" && (
                  <p className="text-sm text-muted-foreground">
                    Você está ativo na equipe. Para sair, peça ao supervisor para remover.
                  </p>
                )}

                {/* REJECTED */}
                {link.status === "REJECTED" && (
                  <p className="text-sm text-muted-foreground">
                    Sua solicitação foi negada. Você pode tentar novamente com outro código.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
