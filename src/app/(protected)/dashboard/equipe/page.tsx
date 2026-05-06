"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Sparkles,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
} from "lucide-react";

type LinkStatus = "PENDING" | "ACTIVE" | "REJECTED";

type TeamLink = {
  id: string;
  status: LinkStatus;
  createdAt: string;
  approvedAt: string | null;
  removedAt: string | null;
  broker: { id: string; name: string | null; email: string; createdAt: string };
};

export default function SupervisorTeamPage() {
  const [user, loading] = useAuthState(auth);
  const [busy, setBusy] = useState(false);

  const [isSupervisor, setIsSupervisor] = useState<boolean>(false);
  const [code, setCode] = useState<string | null>(null);
  const [links, setLinks] = useState<TeamLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function ensureCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/supervisor/code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      setIsSupervisor(true);
      setCode(data.supervisorCode);
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function loadTeam() {
    setError(null);
    try {
      const res = await authedFetch("/api/supervisor/team");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      setIsSupervisor(true);
      setCode(data.supervisorCode || null);
      setLinks(data.links || []);
    } catch (e: any) {
      setError(e.message || "Erro");
    }
  }

  async function action(linkId: string, act: "APPROVE" | "REJECT" | "REMOVE") {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/supervisor/team/action", {
        method: "POST",
        body: JSON.stringify({ linkId, action: act }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      await loadTeam();
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(() => {
    if (!loading && user) loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const pending = useMemo(() => links.filter((l) => l.status === "PENDING"), [links]);
  const active = useMemo(() => links.filter((l) => l.status === "ACTIVE"), [links]);

  if (loading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-52 rounded-xl" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            Minha Equipe
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie corretores vinculados à sua supervisão.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Código de supervisor */}
        <Card className="border-muted-foreground/10 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <CardTitle>Código de supervisor</CardTitle>
                <CardDescription>
                  Compartilhe com corretores para que possam solicitar entrada na sua equipe
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isSupervisor ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <p className="text-sm text-muted-foreground flex-1">
                  Você ainda não está cadastrado como supervisor. Gere seu código para começar.
                </p>
                <Button disabled={busy} onClick={ensureCode}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar código
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <span className="inline-flex items-center rounded-full ring-1 ring-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                    Supervisor
                  </span>
                  {code && (
                    <span className="font-mono text-lg font-bold tracking-widest tabular-nums">
                      {code}
                    </span>
                  )}
                </div>
                {code && (
                  <Button variant="outline" size="sm" onClick={copyCode} className="shrink-0">
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? "Copiado!" : "Copiar código"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Solicitações pendentes */}
        {isSupervisor && (
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <CardTitle>Solicitações pendentes</CardTitle>
                  <CardDescription>Corretores aguardando sua aprovação</CardDescription>
                </div>
                {pending.length > 0 && (
                  <span className="inline-flex items-center rounded-full ring-1 ring-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                    {pending.length}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
                </div>
              ) : (
                pending.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-muted-foreground/10 p-4 space-y-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{l.broker.name || "Sem nome"}</div>
                        <div className="text-sm text-muted-foreground">{l.broker.email}</div>
                      </div>
                      <span className="inline-flex items-center rounded-full ring-1 ring-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 shrink-0">
                        Pendente
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        disabled={busy}
                        size="sm"
                        onClick={() => action(l.id, "APPROVE")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Aprovar
                      </Button>
                      <Button
                        disabled={busy}
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => action(l.id, "REJECT")}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Negar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Corretores ativos */}
        {isSupervisor && (
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                  <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <CardTitle>Corretores ativos</CardTitle>
                  <CardDescription>Membros da sua equipe atualmente vinculados</CardDescription>
                </div>
                {active.length > 0 && (
                  <span className="inline-flex items-center rounded-full ring-1 ring-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {active.length}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhum corretor ativo.</p>
                </div>
              ) : (
                active.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-muted-foreground/10 p-4 space-y-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{l.broker.name || "Sem nome"}</div>
                        <div className="text-sm text-muted-foreground">{l.broker.email}</div>
                      </div>
                      <span className="inline-flex items-center rounded-full ring-1 ring-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                        Ativo
                      </span>
                    </div>

                    <Button
                      disabled={busy}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => action(l.id, "REMOVE")}
                    >
                      <UserMinus className="h-4 w-4 mr-1.5" />
                      Remover da equipe
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
