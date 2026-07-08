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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Send,
  Sparkles,
  UserCheck,
  UserCircle2,
  UserMinus,
  Users,
  XCircle,
  Lock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

type ActiveRole = "corretor" | "supervisor";

type TeamLink = {
  id: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  createdAt: string;
  approvedAt: string | null;
  removedAt: string | null;
  broker: { id: string; name: string | null; email: string; createdAt: string };
};

type BrokerLink = {
  id: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  removedAt: string | null;
  supervisor: {
    id: string;
    name: string | null;
    email: string;
    supervisorCode: string | null;
  };
};

const BROKER_STATUS_CONFIG = {
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
} as const;

// ── Page ───────────────────────────────────────────────

export default function EquipePage() {
  const [user, loadingAuth] = useAuthState(auth);

  // admin gate
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // role selection
  const [activeRole, setActiveRole] = useState<ActiveRole | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // supervisor state
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [supervisorCode, setSupervisorCode] = useState<string | null>(null);
  const [links, setLinks] = useState<TeamLink[]>([]);
  const [copied, setCopied] = useState(false);

  // broker state
  const [brokerLink, setBrokerLink] = useState<BrokerLink | null>(null);
  const [codeInput, setCodeInput] = useState("");

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

  // ── Load both roles on mount ────────────────────────

  async function loadAll() {
    setLoadingData(true);
    setError(null);
    try {
      const [supervisorRes, brokerRes] = await Promise.all([
        authedFetch("/api/supervisor/team").catch(() => null),
        authedFetch("/api/team/join").catch(() => null),
      ]);

      let detectedRole: ActiveRole | null = null;

      if (supervisorRes?.ok) {
        const data = await supervisorRes.json();
        setIsSupervisor(true);
        setSupervisorCode(data.supervisorCode || null);
        setLinks(data.links || []);
        detectedRole = "supervisor";
      }

      if (brokerRes?.ok) {
        const data = await brokerRes.json();
        const lnk: BrokerLink | null = data.link || null;
        setBrokerLink(lnk);
        if (lnk && !lnk.removedAt && detectedRole === null) {
          detectedRole = "corretor";
        }
      }

      setActiveRole(detectedRole);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (!user || loadingAuth) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setIsAdmin(data?.user?.role === "ADMIN");
      } catch {
        setIsAdmin(false);
      }
    })();
  }, [user, loadingAuth]);

  useEffect(() => {
    if (!user || loadingAuth || isAdmin !== true) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingAuth, isAdmin]);

  // ── Supervisor actions ──────────────────────────────

  async function ensureCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/supervisor/code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar código");
      setIsSupervisor(true);
      setSupervisorCode(data.supervisorCode);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function teamAction(linkId: string, act: "APPROVE" | "REJECT" | "REMOVE") {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/supervisor/team/action", {
        method: "POST",
        body: JSON.stringify({ linkId, action: act }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      const teamRes = await authedFetch("/api/supervisor/team");
      const teamData = await teamRes.json();
      if (teamRes.ok) setLinks(teamData.links || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    if (!supervisorCode) return;
    navigator.clipboard.writeText(supervisorCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Broker actions ──────────────────────────────────

  async function joinTeam() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/team/join", {
        method: "POST",
        body: JSON.stringify({ code: codeInput.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      setBrokerLink(data.link);
      setCodeInput("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/team/join", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      const statusRes = await authedFetch("/api/team/join");
      const statusData = await statusRes.json();
      setBrokerLink(statusData.link || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // ── Derived ─────────────────────────────────────────

  const pending = useMemo(() => links.filter((l) => l.status === "PENDING"), [links]);
  const active = useMemo(() => links.filter((l) => l.status === "ACTIVE"), [links]);

  // ── Loading ─────────────────────────────────────────

  if (loadingAuth || isAdmin === null || (isAdmin && loadingData)) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-52 rounded-xl" />
            <Skeleton className="h-4 w-80 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-destructive" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Acesso negado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Você não tem permissão para acessar esta página.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Render ───────────────────────────────────────────

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            Minha Equipe
          </h1>
          <p className="text-muted-foreground mt-1">
            Escolha como você quer participar de uma equipe.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Role selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Corretor card */}
          <button
            onClick={() => setActiveRole("corretor")}
            className={`group relative text-left rounded-2xl border-2 p-6 transition-all duration-200 overflow-hidden ${
              activeRole === "corretor"
                ? "border-blue-500 bg-blue-500/[0.04] shadow-lg shadow-blue-500/10"
                : "border-muted-foreground/10 bg-card hover:border-blue-300/50 hover:shadow-md"
            }`}
          >
            {/* Background glow on selected */}
            {activeRole === "corretor" && (
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/8 via-transparent to-transparent" />
            )}

            {/* Icon */}
            <div
              className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-200 ${
                activeRole === "corretor"
                  ? "bg-blue-500/15 ring-2 ring-blue-500/25"
                  : "bg-blue-500/8 ring-1 ring-blue-500/15 group-hover:bg-blue-500/12 group-hover:ring-blue-500/25"
              }`}
            >
              <UserCircle2
                className={`h-7 w-7 transition-colors duration-200 ${
                  activeRole === "corretor"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-blue-500/60 dark:text-blue-400/60 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                }`}
              />
            </div>

            {/* Text */}
            <p className={`font-bold text-base mb-1.5 transition-colors duration-200 ${
              activeRole === "corretor"
                ? "text-blue-700 dark:text-blue-300"
                : "group-hover:text-blue-700 dark:group-hover:text-blue-300"
            }`}>
              Sou Corretor
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
              Faça parte da equipe de um supervisor usando o código fornecido por ele.
            </p>

            {/* CTA */}
            <div className={`flex items-center gap-1.5 text-xs font-semibold transition-colors duration-200 ${
              activeRole === "corretor"
                ? "text-blue-600 dark:text-blue-400"
                : "text-muted-foreground/70 group-hover:text-blue-600 dark:group-hover:text-blue-400"
            }`}>
              {activeRole === "corretor" ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Selecionado</>
              ) : (
                <><ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /> Selecionar</>
              )}
            </div>
          </button>

          {/* Supervisor card */}
          <button
            onClick={() => setActiveRole("supervisor")}
            className={`group relative text-left rounded-2xl border-2 p-6 transition-all duration-200 overflow-hidden ${
              activeRole === "supervisor"
                ? "border-violet-500 bg-violet-500/[0.04] shadow-lg shadow-violet-500/10"
                : "border-muted-foreground/10 bg-card hover:border-violet-300/50 hover:shadow-md"
            }`}
          >
            {/* Background glow on selected */}
            {activeRole === "supervisor" && (
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/8 via-transparent to-transparent" />
            )}

            {/* Icon */}
            <div
              className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-200 ${
                activeRole === "supervisor"
                  ? "bg-violet-500/15 ring-2 ring-violet-500/25"
                  : "bg-violet-500/8 ring-1 ring-violet-500/15 group-hover:bg-violet-500/12 group-hover:ring-violet-500/25"
              }`}
            >
              <Crown
                className={`h-7 w-7 transition-colors duration-200 ${
                  activeRole === "supervisor"
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-violet-500/60 dark:text-violet-400/60 group-hover:text-violet-600 dark:group-hover:text-violet-400"
                }`}
              />
            </div>

            {/* Text */}
            <p className={`font-bold text-base mb-1.5 transition-colors duration-200 ${
              activeRole === "supervisor"
                ? "text-violet-700 dark:text-violet-300"
                : "group-hover:text-violet-700 dark:group-hover:text-violet-300"
            }`}>
              Sou Supervisor
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
              Crie e gerencie sua própria equipe de corretores com código exclusivo.
            </p>

            {/* CTA */}
            <div className={`flex items-center gap-1.5 text-xs font-semibold transition-colors duration-200 ${
              activeRole === "supervisor"
                ? "text-violet-600 dark:text-violet-400"
                : "text-muted-foreground/70 group-hover:text-violet-600 dark:group-hover:text-violet-400"
            }`}>
              {activeRole === "supervisor" ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Selecionado</>
              ) : (
                <><ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /> Selecionar</>
              )}
            </div>
          </button>

        </div>

        {/* ── CORRETOR CONTENT ── */}
        {activeRole === "corretor" && (
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
                  <UserCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Vínculo com Supervisor</CardTitle>
                  <CardDescription>
                    {!brokerLink || brokerLink.removedAt
                      ? "Digite o código para solicitar entrada"
                      : `Supervisor: ${brokerLink.supervisor.name || brokerLink.supervisor.email}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {!brokerLink || brokerLink.removedAt ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Peça o código ao seu supervisor e cole abaixo para enviar a solicitação.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      maxLength={10}
                      className="max-w-[180px] font-mono tracking-widest uppercase"
                    />
                    <Button disabled={busy || !codeInput.trim()} onClick={joinTeam}>
                      <Send className="h-4 w-4 mr-2" />
                      Solicitar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status pill */}
                  {(() => {
                    const cfg = BROKER_STATUS_CONFIG[brokerLink.status];
                    const Icon = cfg.icon;
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full ring-1 px-3 py-1 text-xs font-semibold ${cfg.cls}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </span>
                    );
                  })()}

                  {/* Supervisor info */}
                  <div className="rounded-xl border border-muted-foreground/10 bg-muted/20 px-4 py-3 text-sm space-y-0.5">
                    <p className="font-medium">{brokerLink.supervisor.name || "Sem nome"}</p>
                    <p className="text-muted-foreground">{brokerLink.supervisor.email}</p>
                  </div>

                  {brokerLink.status === "PENDING" && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Aguardando aprovação do supervisor.
                      </p>
                      <Button
                        disabled={busy}
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={cancelRequest}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar solicitação
                      </Button>
                    </div>
                  )}

                  {brokerLink.status === "ACTIVE" && (
                    <p className="text-sm text-muted-foreground">
                      Você está ativo na equipe. Para sair, peça ao supervisor para remover o seu vínculo.
                    </p>
                  )}

                  {brokerLink.status === "REJECTED" && (
                    <p className="text-sm text-muted-foreground">
                      Sua solicitação foi negada. Você pode tentar novamente com outro código.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── SUPERVISOR CONTENT ── */}
        {activeRole === "supervisor" && (
          <div className="space-y-6">
            {/* Código de supervisor */}
            <Card className="border-muted-foreground/10 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <CardTitle>Código de Supervisor</CardTitle>
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
                      {supervisorCode && (
                        <span className="font-mono text-lg font-bold tracking-widest tabular-nums">
                          {supervisorCode}
                        </span>
                      )}
                    </div>
                    {supervisorCode && (
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
                      <CardTitle>Solicitações Pendentes</CardTitle>
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
                          <Button disabled={busy} size="sm" onClick={() => teamAction(l.id, "APPROVE")}>
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Aprovar
                          </Button>
                          <Button
                            disabled={busy}
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => teamAction(l.id, "REJECT")}
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
                      <CardTitle>Corretores Ativos</CardTitle>
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
                          onClick={() => teamAction(l.id, "REMOVE")}
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
        )}

      </div>
    </Layout>
  );
}
