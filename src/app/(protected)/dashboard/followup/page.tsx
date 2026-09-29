// app/followup/page.tsx
"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { AlertCircle, CalendarClock } from "lucide-react";

import LeadCard, { Lead } from "@/components/LeadCard";
import { buildCommissionMap, type CommissionMap } from "@/lib/commissions";

// ========================
// ETAPAS FIXAS (cadência de follow-up desde o 1º contato)
// ========================

type FollowUpStage = {
  days: number;
  title: string;
  color: string;
};

const STAGES: FollowUpStage[] = [
  { days: 1, title: "D+1", color: "#38bdf8" },
  { days: 3, title: "D+3", color: "#6366f1" },
  { days: 7, title: "D+7", color: "#eab308" },
  { days: 15, title: "D+15", color: "#f97316" },
  { days: 30, title: "D+30", color: "#ef4444" },
];

// Leads finalizados ou já agendados para retornar não entram na cadência.
const EXCLUDED_STATUS = ["Concluído", "Dispensado", "Retornar"];

// ========================
// HELPERS
// ========================

function getAgeDays(dataEntrada: string): number | null {
  const entrada = new Date(dataEntrada);
  if (Number.isNaN(entrada.getTime())) return null;
  return Math.floor((Date.now() - entrada.getTime()) / 86_400_000);
}

/** Maior etapa da cadência já alcançada pelo lead (a mais recente que ele cruzou). */
function getStageForAge(ageDays: number): FollowUpStage | null {
  let stage: FollowUpStage | null = null;
  for (const s of STAGES) {
    if (ageDays >= s.days) stage = s;
  }
  return stage;
}

// ========================
// PAGE
// ========================

const FollowUpPage = () => {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [commissionMap, setCommissionMap] = React.useState<CommissionMap>({});

  const fetchLeads = React.useCallback(async () => {
    if (!firebaseUser) return;

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Erro ao carregar leads: " + (body.error || res.statusText));
        setLoading(false);
        return;
      }

      const data: Lead[] = await res.json();
      setLeads(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  React.useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    fetchLeads();
  }, [firebaseUser, loadingAuth, fetchLeads]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    const params = new URLSearchParams({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "",
    });
    fetch(`/api/configuracoes/comissoes?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { operadora: string; modalidade: string; percentual: number }[]) => {
        setCommissionMap(buildCommissionMap(data));
      })
      .catch(() => {/* silently ignore */});
  }, [firebaseUser]);

  // ========================
  // AGRUPAMENTO POR ETAPA
  // ========================

  const leadsByStage = React.useMemo(() => {
    const map = new Map<number, { lead: Lead; ageDays: number }[]>();
    STAGES.forEach((s) => map.set(s.days, []));

    for (const lead of leads) {
      if (EXCLUDED_STATUS.includes(lead.status)) continue;
      const ageDays = getAgeDays(lead.data_entrada);
      if (ageDays === null || ageDays < 1) continue;
      const stage = getStageForAge(ageDays);
      if (!stage) continue;
      map.get(stage.days)!.push({ lead, ageDays });
    }

    map.forEach((arr) => {
      arr.sort((a, b) => {
        const aT = a.lead.last_chamado_at ? new Date(a.lead.last_chamado_at).getTime() : 0;
        const bT = b.lead.last_chamado_at ? new Date(b.lead.last_chamado_at).getTime() : 0;
        return aT - bT;
      });
    });

    return map;
  }, [leads]);

  // ========================
  // RENDER
  // ========================

  const FollowUpSkeleton = () => (
    <Layout fullWidth>
      <div className="space-y-2 mb-6">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col min-w-60 w-60 shrink-0 gap-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl opacity-60" />
          </div>
        ))}
      </div>
    </Layout>
  );

  if (loadingAuth || loading) return <FollowUpSkeleton />;

  if (!firebaseUser) {
    return (
      <Layout fullWidth>
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-4">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold tracking-tight">
            Você precisa estar logado para ver os follow-ups.
          </p>
          <p className="text-sm text-muted-foreground">
            Acesse a tela de login e entre com sua conta.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Cadência</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Follow-up</h1>
          <p className="text-sm text-muted-foreground">
            Leads organizados por dias desde o 1º contato (D+1, D+3, D+7, D+15, D+30)
          </p>
        </div>
      </header>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 200px)" }}>
        {STAGES.map((stage) => {
          const items = leadsByStage.get(stage.days) ?? [];

          return (
            <div key={stage.days} className="flex flex-col min-w-60 w-60 shrink-0">
              {/* Cabeçalho da coluna */}
              <div
                className="p-3 rounded-xl mb-2 border"
                style={{
                  backgroundColor: stage.color + "15",
                  borderColor: stage.color + "30",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="font-semibold text-sm truncate">{stage.title}</h3>
                  </div>
                  <span
                    className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums shrink-0"
                    style={{
                      color: stage.color,
                      backgroundColor: stage.color + "18",
                      boxShadow: `0 0 0 1px ${stage.color}40`,
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 pl-4">
                  {stage.days === 1
                    ? "1 dia ou mais sem retorno"
                    : `${stage.days} dias ou mais sem retorno`}
                </p>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 rounded-xl p-1">
                {items.length === 0 && (
                  <p className="text-center text-[11px] text-muted-foreground py-6">
                    Nenhum lead nesta etapa
                  </p>
                )}
                {items.map(({ lead, ageDays }) => (
                  <div key={lead.id} className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <Badge
                        variant="outline"
                        className="h-5 rounded-md border-border/60 px-1.5 py-0 text-[10px] font-medium tabular-nums"
                      >
                        {ageDays} {ageDays === 1 ? "dia" : "dias"} desde o 1º contato
                      </Badge>
                    </div>
                    <LeadCard
                      lead={lead}
                      firebaseUser={{
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                      }}
                      onRefreshLeads={fetchLeads}
                      commissionMap={commissionMap}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
};

export default FollowUpPage;
