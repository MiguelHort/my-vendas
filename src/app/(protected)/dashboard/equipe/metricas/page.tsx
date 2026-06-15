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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import {
  AlertCircle,
  BarChart2,
  Filter,
  Layers,
  MapPin,
  Medal,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

type Lead = {
  id: string;
  nome: string;
  origem: string;
  status: string;
  valor_comissao: number | null;
  data_entrada: string;
  estado: string;
  cidade?: string | null;
  operadora_ofertada?: string | null;
  qtd_vidas?: number;
  updated_at?: string;
  data_venda: string | null;
  last_chamado_at?: string | null;
  retornar_em?: string | null;
};

type FunnelColumn = {
  id: string;
  title: string;
  color: string;
};

type Broker = {
  id: string;
  name: string | null;
  email: string;
};

type MemberStats = {
  id: string;
  name: string | null;
  email: string;
  isSelf: boolean;
  totalLeads: number;
  byStatus: Record<string, number>;
  totalVendas: number;
  totalComissao: number;
  conversionRate: number;
  lastActivity: string | null;
};

type TeamStats = {
  members: MemberStats[];
  team: {
    totalLeads: number;
    totalVendas: number;
    totalComissao: number;
    avgConversionRate: number;
    byStatus: Record<string, number>;
  };
};

const geographyUrl =
  "https://raw.githubusercontent.com/giuliano-macedo/geodata-br-states/main/geojson/br_states.json";

const getFlagUrl = (uf: string) =>
  `https://raw.githubusercontent.com/bgeneto/bandeiras-br/master/imagens/${uf.toUpperCase()}.png`;

const NOME_PARA_SIGLA: Record<string, string> = {
  Acre: "AC",
  Alagoas: "AL",
  Amapá: "AP",
  Amazonas: "AM",
  Bahia: "BA",
  Ceará: "CE",
  "Distrito Federal": "DF",
  "Espírito Santo": "ES",
  Goiás: "GO",
  Maranhão: "MA",
  "Mato Grosso": "MT",
  "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG",
  Pará: "PA",
  Paraíba: "PB",
  Paraná: "PR",
  Pernambuco: "PE",
  Piauí: "PI",
  "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS",
  Rondônia: "RO",
  Roraima: "RR",
  "Santa Catarina": "SC",
  "São Paulo": "SP",
  Sergipe: "SE",
  Tocantins: "TO",
};

const STATUS_ORDER = [
  "Dispensado",
  "Abordagem",
  "Avaliando",
  "Fechamento",
  "Concluído",
] as const;
type LeadStatus = (typeof STATUS_ORDER)[number];

function timeAgo(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  const mins = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60_000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function shortName(member: { name: string | null; email: string }): string {
  if (member.name) return member.name.split(" ")[0];
  return member.email.split("@")[0];
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

const STATUS_COLORS_MAP: Record<string, string> = {
  Dispensado: "#6b7280",
  Abordagem:  "#3b82f6",
  Avaliando:  "#eab308",
  Fechamento: "#8b5cf6",
  Concluído:  "#22c55e",
  Retornar:   "#f59e0b",
};

const DEFAULT_FUNNEL_COLUMNS: FunnelColumn[] = [
  { id: "Dispensado", title: "Dispensado", color: "#6b7280" },
  { id: "Abordagem",  title: "Abordagem",  color: "#3b82f6" },
  { id: "Avaliando",  title: "Avaliando",  color: "#eab308" },
  { id: "Fechamento", title: "Fechamento", color: "#8b5cf6" },
  { id: "Concluído",  title: "Concluído",  color: "#22c55e" },
];

const RETORNAR_COLUMN: FunnelColumn = { id: "Retornar", title: "Retornar Futuramente", color: "#f59e0b" };

const STATUS_ACCENT: Record<LeadStatus, { pill: string }> = {
  Dispensado: { pill: "ring-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" },
  Abordagem:  { pill: "ring-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  Avaliando:  { pill: "ring-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  Fechamento: { pill: "ring-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  Concluído:  { pill: "ring-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
};

function normalizeStatus(s: string) {
  return (s || "").trim();
}

// ─────────────────────────────────────────────
// TEAM OVERVIEW COMPONENT
// ─────────────────────────────────────────────

function StatCard({
  icon,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="border-muted-foreground/10 shadow-sm">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold tabular-nums leading-tight mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamOverview({ stats }: { stats: TeamStats }) {
  const { team, members } = stats;

  const ranked = [...members].sort((a, b) => b.totalVendas - a.totalVendas);

  const vendaChartData = ranked.map((m) => ({
    nome: shortName(m),
    vendas: m.totalVendas,
    fill: m.totalVendas === ranked[0]?.totalVendas && m.totalVendas > 0 ? "#10b981" : "#8b5cf6",
  }));

  const taxaChartData = ranked.map((m) => ({
    nome: shortName(m),
    taxa: m.conversionRate,
    fill: m.conversionRate === ranked.reduce((best, x) => (x.conversionRate > best ? x.conversionRate : best), 0) && m.conversionRate > 0
      ? "#10b981"
      : "#3b82f6",
  }));

  const statusChartData = Object.entries(team.byStatus)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS_MAP[name] || "#94a3b8",
    }));

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-muted-foreground/10 bg-popover px-3 py-2 text-xs shadow-md">
        <p className="font-semibold">{payload[0]?.payload?.nome}</p>
        <p className="text-muted-foreground">{payload[0]?.name}: <span className="font-bold text-foreground">{payload[0]?.value}</span></p>
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-muted-foreground/10 bg-popover px-3 py-2 text-xs shadow-md">
        <p className="font-semibold">{payload[0]?.name}</p>
        <p className="text-muted-foreground">{payload[0]?.value} lead{payload[0]?.value !== 1 ? "s" : ""}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 4 summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
          iconBg="bg-violet-500/10 ring-1 ring-violet-500/20"
          label="Total de Leads"
          value={team.totalLeads.toLocaleString("pt-BR")}
          sub={`${members.length} membro${members.length !== 1 ? "s" : ""} no time`}
        />
        <StatCard
          icon={<Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-500/10 ring-1 ring-emerald-500/20"
          label="Total de Vendas"
          value={team.totalVendas.toLocaleString("pt-BR")}
          sub="status Concluído"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-500/10 ring-1 ring-blue-500/20"
          label="Comissão Total"
          value={formatBRL(team.totalComissao)}
          sub="estimativa acumulada"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-500/10 ring-1 ring-amber-500/20"
          label="Conversão Média"
          value={`${team.avgConversionRate}%`}
          sub="leads → Concluído"
        />
      </div>

      {/* Ranking + Distribuição de Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <Card className="border-muted-foreground/10 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
                <Medal className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base">Ranking de Vendas</CardTitle>
                <CardDescription>Corretores ordenados por Concluído</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {ranked.map((member, idx) => {
              const pct = team.totalVendas > 0 ? (member.totalVendas / team.totalVendas) * 100 : 0;
              const isFirst = idx === 0 && member.totalVendas > 0;
              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${isFirst ? "bg-emerald-500/5 border border-emerald-500/20" : "hover:bg-muted/40"}`}
                >
                  <span className="text-lg w-8 text-center shrink-0">
                    {RANK_MEDALS[idx] ?? <span className="text-sm font-bold text-muted-foreground">{idx + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold truncate">
                        {member.name || member.email}
                        {member.isSelf && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(você)</span>}
                      </p>
                      <span className="text-sm font-bold tabular-nums shrink-0 ml-2">
                        {member.totalVendas}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isFirst ? "#10b981" : "#8b5cf6",
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {member.conversionRate}% conversão
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatBRL(member.totalComissao)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Distribuição de status */}
        <Card className="border-muted-foreground/10 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
                <BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Distribuição do Time</CardTitle>
                <CardDescription>Todos os leads por status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {statusChartData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de barras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por corretor */}
        <Card className="border-muted-foreground/10 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Vendas por Corretor</CardTitle>
                <CardDescription>Total de leads Concluídos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendaChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
                  <Bar dataKey="vendas" name="Vendas" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {vendaChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de conversão */}
        <Card className="border-muted-foreground/10 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Taxa de Conversão</CardTitle>
                <CardDescription>% de leads que viraram venda</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taxaChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                  <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
                  <Bar dataKey="taxa" name="Taxa" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {taxaChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DesempenhoTimePage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"individual" | "equipe">("individual");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [funnelColumns, setFunnelColumns] = useState<FunnelColumn[]>(DEFAULT_FUNNEL_COLUMNS);
  const [loading, setLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    uf: string;
    vendas: number;
    x: number;
    y: number;
  }>({ visible: false, uf: "", vendas: 0, x: 0, y: 0 });

  const [filtroFinalizados, setFiltroFinalizados] = useState<string>("este-mes");

  async function authedFetch(input: RequestInfo, init?: RequestInit) {
    if (!firebaseUser) throw new Error("Não autenticado");
    const token = await firebaseUser.getIdToken();
    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
    });
  }

  const fetchBrokers = async () => {
    if (!firebaseUser) return;
    try {
      const res = await authedFetch("/api/supervisor/brokers");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Erro ao carregar corretores: " + (body.error || res.statusText));
        return;
      }
      setBrokers(body.brokers || []);
      setSelectedBrokerId("ME");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar corretores");
    }
  };

  const fetchTeamStats = async () => {
    if (!firebaseUser) return;
    setLoadingTeam(true);
    try {
      const res = await authedFetch("/api/supervisor/team-stats");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Erro ao carregar dados do time: " + (body.error || res.statusText));
        return;
      }
      setTeamStats(body);
    } catch {
      toast.error("Erro ao carregar dados do time");
    } finally {
      setLoadingTeam(false);
    }
  };

  const fetchFunnelColumns = async (brokerId: string) => {
    if (!firebaseUser) return;
    try {
      const meRes = await authedFetch("/api/supervisor/me");
      const meBody = await meRes.json().catch(() => ({}));
      if (!meRes.ok) return;
      const meDbId: string = meBody.id;
      const finalBrokerId = brokerId === "ME" ? meDbId : brokerId;

      const res = await authedFetch(
        `/api/supervisor/funnel-columns?brokerId=${encodeURIComponent(finalBrokerId)}`
      );
      const body = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(body.columns) && body.columns.length > 0) {
        setFunnelColumns(body.columns);
      } else {
        setFunnelColumns(DEFAULT_FUNNEL_COLUMNS);
      }
    } catch {
      setFunnelColumns(DEFAULT_FUNNEL_COLUMNS);
    }
  };

  const fetchLeads = async (brokerId: string) => {
    if (!firebaseUser) return;
    setLoadingLeads(true);
    try {
      const meRes = await authedFetch("/api/supervisor/me");
      const meBody = await meRes.json().catch(() => ({}));
      if (!meRes.ok) {
        toast.error("Erro ao carregar usuário: " + (meBody.error || meRes.statusText));
        return;
      }

      const meDbId: string = meBody.id;
      const finalBrokerId = brokerId === "ME" ? meDbId : brokerId;

      const res = await authedFetch(
        `/api/supervisor/leads?brokerId=${encodeURIComponent(finalBrokerId)}`
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Erro ao carregar leads: " + (body.error || res.statusText));
        setLeads([]);
        return;
      }
      setLeads(body || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoadingLeads(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    fetchBrokers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, loadingAuth]);

  useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    if (!selectedBrokerId) return;
    fetchLeads(selectedBrokerId);
    fetchFunnelColumns(selectedBrokerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrokerId, firebaseUser, loadingAuth]);

  useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    if (activeTab !== "equipe") return;
    if (teamStats) return; // já carregou
    fetchTeamStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, firebaseUser, loadingAuth]);

  const statusCounts = useMemo(() => {
    const base: Record<LeadStatus, number> = {
      Dispensado: 0,
      Abordagem: 0,
      Avaliando: 0,
      Fechamento: 0,
      Concluído: 0,
    };

    for (const l of leads) {
      const st = normalizeStatus(l.status) as LeadStatus;
      if (st in base) base[st] += 1;
    }

    const total = leads.length;
    const totalNoFunil = Object.values(base).reduce((a, b) => a + b, 0);
    return { ...base, total, totalNoFunil };
  }, [leads]);

  const vendasPorEstado = useMemo(() => {
    const mapa: Record<string, number> = {};
    const now = new Date();
    const cutoffIso = (() => {
      switch (filtroFinalizados) {
        case "7-dias": {
          const d = new Date(now);
          d.setDate(d.getDate() - 7);
          return d.toISOString();
        }
        case "15-dias": {
          const d = new Date(now);
          d.setDate(d.getDate() - 15);
          return d.toISOString();
        }
        case "este-mes":
          return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        case "3-meses": {
          const d = new Date(now);
          d.setMonth(d.getMonth() - 3);
          return d.toISOString();
        }
        case "todo-historico":
          return null;
        default:
          return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      }
    })();

    leads
      .filter((l) => normalizeStatus(l.status) === "Concluído")
      .filter((lead) => {
        if (!cutoffIso) return true;
        if (!lead.data_venda) return false;
        return new Date(lead.data_venda) >= new Date(cutoffIso);
      })
      .forEach((lead) => {
        const uf = lead.estado || "N/D";
        mapa[uf] = (mapa[uf] || 0) + 1;
      });

    return mapa;
  }, [leads, filtroFinalizados]);

  const { estadoTop, maxVendas, totalEstados, totalVendas } = useMemo(() => {
    let max = 0;
    let ufTop: string | null = null;
    let total = 0;
    let estadosComVenda = 0;

    Object.entries(vendasPorEstado).forEach(([uf, qtd]) => {
      total += qtd;
      if (qtd > 0) estadosComVenda += 1;
      if (qtd > max) { max = qtd; ufTop = uf; }
    });

    return { estadoTop: ufTop, maxVendas: max, totalEstados: estadosComVenda, totalVendas: total };
  }, [vendasPorEstado]);

  // ---- loading / auth states ----
  if (loadingAuth || loading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-10 w-72 rounded-xl" />
              <Skeleton className="h-4 w-96 rounded-lg" />
            </div>
            <Skeleton className="h-12 w-[480px] rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
            <Skeleton className="h-[480px] rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-56 rounded-2xl" />
              <Skeleton className="h-56 rounded-2xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!firebaseUser) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Sessão não encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Acesse a tela de login e entre com sua conta.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const selectedLabel =
    selectedBrokerId === "ME"
      ? "Eu (Supervisor)"
      : brokers.find((b) => b.id === selectedBrokerId)?.name ||
        brokers.find((b) => b.id === selectedBrokerId)?.email ||
        "Corretor";

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                Desempenho do Time
              </h1>
              <p className="text-muted-foreground mt-1">
                {activeTab === "individual"
                  ? "Selecione um corretor para ver o mapa e os indicadores do funil."
                  : "Visão consolidada de toda a equipe com rankings e gráficos."}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted rounded-2xl p-1 self-start lg:self-auto">
              <button
                onClick={() => setActiveTab("individual")}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "individual"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setActiveTab("equipe")}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "equipe"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Visão da Equipe
              </button>
            </div>
          </div>

          {/* Filter bar — só na aba individual */}
          {activeTab === "individual" && (
            <div className="flex flex-wrap items-center gap-1 bg-background/70 backdrop-blur-sm border border-muted-foreground/10 rounded-2xl px-4 py-2 shadow-sm self-start">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0 mr-1" />

              <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
                <SelectTrigger className="w-[220px] border-0 shadow-none focus:ring-0 bg-transparent">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ME">Eu (Supervisor)</SelectItem>
                  {brokers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name ? `${b.name} (${b.email})` : b.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-px h-5 bg-muted-foreground/20 mx-1" />

              <Select value={filtroFinalizados} onValueChange={setFiltroFinalizados}>
                <SelectTrigger className="w-[170px] border-0 shadow-none focus:ring-0 bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="7-dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="15-dias">Últimos 15 dias</SelectItem>
                  <SelectItem value="este-mes">Este Mês</SelectItem>
                  <SelectItem value="3-meses">Últimos 3 meses</SelectItem>
                  <SelectItem value="todo-historico">Todo o Histórico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Content */}
        {activeTab === "equipe" ? (
          loadingTeam ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
              </div>
            </div>
          ) : teamStats ? (
            <TeamOverview stats={teamStats} />
          ) : null
        ) : loadingLeads ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
              <Skeleton className="h-[480px] rounded-2xl" />
              <div className="space-y-6">
                <Skeleton className="h-56 rounded-2xl" />
                <Skeleton className="h-56 rounded-2xl" />
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {STATUS_ORDER.map((st) => (
                <Skeleton key={st} className="shrink-0 w-[220px] h-[200px] rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
            {/* Mapa */}
            <Card className="overflow-hidden border-muted-foreground/10 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>Mapa de vendas</CardTitle>
                    <CardDescription>{selectedLabel}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[420px]">
                  <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 700, center: [-55, -15] }}
                    width={800}
                    height={500}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <Geographies geography={geographyUrl}>
                      {({ geographies }: { geographies: any[] }) =>
                        geographies.map((geo) => {
                          const props = geo.properties || {};
                          let uf: string =
                            props.sigla || props.UF || props.uf || props.SIGLA || props.code || "";

                          if (!uf && props.name && typeof props.name === "string") {
                            uf = NOME_PARA_SIGLA[props.name] || "";
                          }

                          const vendas = vendasPorEstado[uf] || 0;
                          const isTop = estadoTop === uf && maxVendas > 0;
                          const temVendas = vendas > 0;

                          const baseFill = isTop ? "#16a34a" : temVendas ? "#bbf7d0" : "#ffffff";
                          const hoverFill = isTop ? "#15803d" : temVendas ? "#22c55e" : "#cbd5e1";

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              style={{
                                default: {
                                  fill: baseFill,
                                  stroke: "#9ca3af",
                                  strokeWidth: 0.7,
                                  outline: "none",
                                  transition: "transform 150ms ease, fill 150ms ease",
                                  cursor: temVendas ? "pointer" : "default",
                                },
                                hover: {
                                  fill: hoverFill,
                                  stroke: "#4b5563",
                                  strokeWidth: 1,
                                  outline: "none",
                                  cursor: "pointer",
                                },
                                pressed: { fill: hoverFill, outline: "none" },
                              }}
                              onMouseEnter={(e: any) =>
                                setTooltip({ visible: true, uf, vendas, x: e.clientX, y: e.clientY })
                              }
                              onMouseMove={(e: any) =>
                                setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }))
                              }
                              onMouseLeave={() =>
                                setTooltip((prev) => ({ ...prev, visible: false }))
                              }
                            />
                          );
                        })
                      }
                    </Geographies>
                  </ComposableMap>

                  {tooltip.visible && (
                    <div
                      className="pointer-events-none fixed z-50 rounded-xl border border-muted-foreground/10 bg-popover px-3 py-2 text-xs shadow-md"
                      style={{ top: tooltip.y + 12, left: tooltip.x + 12 }}
                    >
                      <div className="font-semibold">{tooltip.uf || "Sem UF"}</div>
                      <div className="text-muted-foreground">
                        {tooltip.vendas} venda{tooltip.vendas === 1 ? "" : "s"} concluída
                        {tooltip.vendas === 1 ? "" : "s"}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Painel lateral */}
            <div className="space-y-6">
              {/* Leads por status */}
              <Card className="border-muted-foreground/10 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
                      <BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">Leads por status</CardTitle>
                      <CardDescription>Distribuição no funil do CRM</CardDescription>
                    </div>
                    <span className="inline-flex items-center rounded-full ring-1 ring-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 tabular-nums shrink-0">
                      {statusCounts.total}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_ORDER.map((st) => (
                      <div
                        key={st}
                        className="rounded-xl border border-muted-foreground/10 p-3 hover:-translate-y-0.5 transition-transform duration-200"
                      >
                        <div className="text-xs text-muted-foreground mb-1">{st}</div>
                        <div className="flex items-end justify-between gap-2">
                          <span className="text-2xl font-bold tracking-tight tabular-nums">
                            {statusCounts[st]}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full ring-1 px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_ACCENT[st].pill}`}
                          >
                            {statusCounts.total > 0
                              ? Math.round((statusCounts[st] / statusCounts.total) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {statusCounts.totalNoFunil !== statusCounts.total && (
                    <p className="text-xs text-muted-foreground pt-1">
                      {statusCounts.total - statusCounts.totalNoFunil} lead(s) com status fora desses 5.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Resumo por estado */}
              <Card className="border-muted-foreground/10 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                      <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">Resumo por estado</CardTitle>
                      {totalEstados > 0 && (
                        <CardDescription>
                          {totalEstados} estado{totalEstados === 1 ? "" : "s"} com vendas
                        </CardDescription>
                      )}
                    </div>
                    {totalVendas > 0 && (
                      <span className="inline-flex items-center rounded-full ring-1 ring-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums shrink-0">
                        {totalVendas} venda{totalVendas === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {estadoTop ? (
                    <div className="flex items-start gap-3 rounded-xl border border-muted-foreground/10 bg-emerald-500/5 p-4">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 shrink-0">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Estado campeão no período
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-2 text-xl font-bold tracking-tight">
                            <img
                              src={getFlagUrl(estadoTop)}
                              alt={`Bandeira de ${estadoTop}`}
                              className="h-7 w-10 rounded-sm border object-cover"
                            />
                            {Object.entries(NOME_PARA_SIGLA).find(
                              ([_, sigla]) => sigla === estadoTop
                            )?.[0] || estadoTop}
                          </span>
                          <span className="inline-flex items-center rounded-full ring-1 ring-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                            {maxVendas} venda{maxVendas === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Nenhuma venda no período</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ajuste o filtro para ver resultados.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="max-h-[220px] overflow-auto rounded-xl border border-muted-foreground/10">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-muted-foreground/10">
                        <tr>
                          <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Estado
                          </th>
                          <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Vendas
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(vendasPorEstado)
                          .sort((a, b) => b[1] - a[1])
                          .map(([uf, qtd]) => {
                            const isTop = estadoTop === uf && maxVendas > 0;
                            return (
                              <tr
                                key={uf}
                                className="border-b border-muted-foreground/5 last:border-0 hover:bg-muted/40 transition-colors"
                              >
                                <td className="py-2 px-3 font-medium">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={getFlagUrl(uf)}
                                      alt={`Bandeira de ${uf}`}
                                      className="h-4 w-6 rounded-sm border object-cover"
                                    />
                                    {isTop && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                                    <span>{uf}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                    {qtd}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mini Kanban */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Kanban do Corretor</h2>
                <p className="text-sm text-muted-foreground">Funil de {selectedLabel} — somente leitura</p>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-3">
              {[
                ...funnelColumns,
                ...(leads.some((l) => l.status === "Retornar") ? [RETORNAR_COLUMN] : []),
              ].map((col) => {
                const colLeads = leads.filter((l) => l.status === col.id);
                return (
                  <div
                    key={col.id}
                    className="shrink-0 w-[220px] flex flex-col rounded-xl border border-muted-foreground/10 bg-background/60 shadow-sm overflow-hidden"
                    style={{ borderTopWidth: 2, borderTopStyle: "solid", borderTopColor: col.color }}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-muted-foreground/10">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: col.color }}
                        />
                        <span className="text-sm font-medium truncate">{col.title}</span>
                      </div>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums shrink-0 ml-1"
                        style={{
                          backgroundColor: `${col.color}22`,
                          color: col.color,
                          border: `1px solid ${col.color}44`,
                        }}
                      >
                        {colLeads.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-1.5">
                      {colLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-1 text-muted-foreground">
                          <span className="text-xl">○</span>
                          <span className="text-xs">Vazio</span>
                        </div>
                      ) : (
                        colLeads.map((lead) => (
                          <div
                            key={lead.id}
                            className="rounded-lg border border-muted-foreground/10 bg-card p-2.5 hover:bg-muted/40 transition-colors"
                          >
                            <p className="text-xs font-semibold leading-tight line-clamp-1 mb-1">
                              {lead.nome}
                            </p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {[lead.estado, lead.cidade, lead.operadora_ofertada]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            <div className="flex items-center justify-between mt-1.5">
                              {lead.qtd_vidas != null && (
                                <span className="text-[10px] text-muted-foreground">
                                  {lead.qtd_vidas} {lead.qtd_vidas === 1 ? "vida" : "vidas"}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {timeAgo(lead.updated_at)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
        )}
      </div>
    </Layout>
  );
}
