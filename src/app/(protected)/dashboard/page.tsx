// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import Link from "next/link";
import { Layout } from "@/components/Layout";
import LeadCard, { Lead as FunilLead } from "@/components/LeadCard";

import { toast } from "sonner";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  CheckCircle2,
  MapPin,
  Clock,
  ArrowUpRight,
  Info,
  Activity,
  Filter,
  AlertCircle,
  Medal,
  Award,
  Star,
  Trophy,
  Crown,
  type LucideIcon,
} from "lucide-react";

// shadcn ui
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// charts (shadcn wrapper + recharts)
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";

type Lead = FunilLead;

type SerieVendasMode = "semana" | "mes" | "ano";

function useCountUp(target: number, duration = 800) {
  const [displayed, setDisplayed] = useState(target);
  const rafRef = useRef<number | null>(null);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) return;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayed;
}

/* ─── nivel helpers (inline — evita import circular) ─── */
type NivelInfo = { number: number; name: string; color: string; glow: string; Icon: LucideIcon };

const NIVEL_COLOR = "var(--primary)";
const NIVEL_GLOW  = "color-mix(in srgb, var(--primary) 35%, transparent)";

function getNivelInfo(commission: number): NivelInfo {
  if (commission >= 30_000) return { number: 5, name: "Elite",        color: NIVEL_COLOR, glow: NIVEL_GLOW, Icon: Crown  };
  if (commission >= 15_000) return { number: 4, name: "Especialista", color: NIVEL_COLOR, glow: NIVEL_GLOW, Icon: Trophy };
  if (commission >= 6_000)  return { number: 3, name: "Consultor",    color: NIVEL_COLOR, glow: NIVEL_GLOW, Icon: Star   };
  if (commission >= 2_000)  return { number: 2, name: "Corretor",     color: NIVEL_COLOR, glow: NIVEL_GLOW, Icon: Award  };
  return                           { number: 1, name: "Aspirante",    color: NIVEL_COLOR, glow: NIVEL_GLOW, Icon: Medal  };
}

const DashboardPage = () => {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [nivelInfo, setNivelInfo] = useState<NivelInfo | null>(null);
  const [filtroOrigem, setFiltroOrigem] = useState<string>("Todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("este-mes");
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>("");
  const [filtroDataFim, setFiltroDataFim] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [serieVendasMode, setSerieVendasMode] =
    useState<SerieVendasMode>("semana");

  // ----------------- helpers -----------------
  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (filtroPeriodo) {
      case "este-mes":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59
        );
        break;
      case "mes-passado":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case "ultimos-90":
        const past = new Date();
        past.setDate(past.getDate() - 90);
        startDate = past;
        endDate = new Date();
        break;
      case "personalizado":
        if (filtroDataInicio && filtroDataFim) {
          startDate = new Date(filtroDataInicio + "T00:00:00");
          endDate   = new Date(filtroDataFim   + "T23:59:59");
        }
        break;
    }

    return { startDate, endDate };
  };

  const isLeadAtivo = (status: string) =>
    ["Cotação", "Avaliando", "Fechamento"].includes(status);

  const leadPrecisaRetorno = (lead: Lead) => {
    if (!isLeadAtivo(lead.status)) return false;
    if (!lead.last_chamado_at) return true;

    const last = new Date(lead.last_chamado_at);
    if (Number.isNaN(last.getTime())) return false;

    const now = new Date();
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  };

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const monthShort = (mIdx: number) => {
    const names = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    return names[mIdx] || "";
  };

  const periodoLabel = useMemo(() => {
    switch (filtroPeriodo) {
      case "este-mes":
        return "Este mês";
      case "mes-passado":
        return "Mês passado";
      case "ultimos-90":
        return "Últimos 90 dias";
      case "personalizado":
        if (filtroDataInicio && filtroDataFim) {
          const fmt = (s: string) => {
            const [y, m, d] = s.split("-");
            return `${d}/${m}/${y}`;
          };
          return `${fmt(filtroDataInicio)} → ${fmt(filtroDataFim)}`;
        }
        return "Intervalo personalizado";
      default:
        return "Período";
    }
  }, [filtroPeriodo, filtroDataInicio, filtroDataFim]);

  // ----------------- fetch Leads -----------------
  const fetchLeads = async () => {
    if (!firebaseUser) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(`/api/leads?${params.toString()}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao carregar dados de leads: " + (body.error || res.statusText)
        );
        return;
      }

      const data: Lead[] = await res.json();
      setLeads(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados de leads");
    } finally {
      setLoading(false);
    }
  };

  // ----------------- effects -----------------
  useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, loadingAuth]);

  useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    const params = new URLSearchParams({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "",
    });
    fetch(`/api/nivel?${params}`)
      .then((r) => r.json())
      .then((d) => setNivelInfo(getNivelInfo(d.lastMonthCommission ?? 0)))
      .catch(() => {});
  }, [firebaseUser, loadingAuth]);

  // ----------------- métricas (filtradas) -----------------
  const filteredLeads = useMemo(() => {
    const { startDate, endDate } = getDateRange();
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    return leads.filter((lead) => {
      const leadDateStr = lead.data_entrada.slice(0, 10);
      const dentroDataRange = leadDateStr >= startStr && leadDateStr <= endStr;
      const origemMatch =
        filtroOrigem === "Todos" || lead.origem === filtroOrigem;
      return dentroDataRange && origemMatch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, filtroOrigem, filtroPeriodo, filtroDataInicio, filtroDataFim]);

  // Vendas fechadas no período filtradas por data_venda (não data_entrada)
  const vendasNoPeriodo = useMemo(() => {
    const { startDate, endDate } = getDateRange();
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    return leads.filter((lead) => {
      if (lead.status !== "Concluído" || !lead.data_venda) return false;
      const dateStr = lead.data_venda.slice(0, 10);
      const origemMatch =
        filtroOrigem === "Todos" || lead.origem === filtroOrigem;
      return dateStr >= startStr && dateStr <= endStr && origemMatch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, filtroOrigem, filtroPeriodo, filtroDataInicio, filtroDataFim]);

  const totalLeads = filteredLeads.length;
  const vendasFechadas = vendasNoPeriodo.length;

  const totalComissoes = vendasNoPeriodo
    .reduce((acc, l) => acc + (l.valor_comissao || 0), 0);

  const leadsQualificados = filteredLeads.filter((l) =>
    ["Avaliando", "Fechamento", "Concluído"].includes(l.status)
  ).length;

  const taxaQualificacao =
    totalLeads > 0 ? (leadsQualificados / totalLeads) * 100 : 0;

  const taxaFechamento =
    totalLeads > 0 ? (vendasFechadas / totalLeads) * 100 : 0;

  const leadsParaRetorno = useMemo(() => {
    return filteredLeads.filter(leadPrecisaRetorno).sort((a, b) => {
      const aHasLast = !!a.last_chamado_at;
      const bHasLast = !!b.last_chamado_at;

      if (!aHasLast && !bHasLast) return 0;
      if (!aHasLast && bHasLast) return -1;
      if (aHasLast && !bHasLast) return 1;

      const aTime = new Date(a.last_chamado_at as string).getTime();
      const bTime = new Date(b.last_chamado_at as string).getTime();
      return aTime - bTime;
    });
  }, [filteredLeads]);

  const qtdLeadsParaRetorno = leadsParaRetorno.length;

  const animatedComissoes = useCountUp(totalComissoes ?? 0);
  const comissoesFmt = animatedComissoes.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const ticketMedio =
    vendasFechadas > 0 ? totalComissoes / vendasFechadas : 0;
  const ticketMedioFmt = ticketMedio.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // ----------------- Série de vendas -----------------
  const vendasConcluidas = useMemo(() => {
    return leads.filter((l) => l.status === "Concluído" && !!l.data_venda);
  }, [leads]);

  const vendasSerieData = useMemo(() => {
    const now = new Date();

    if (serieVendasMode === "semana") {
      const days: Date[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push(d);
      }

      const map = new Map<string, number>();
      for (const d of days) map.set(ymd(d), 0);

      for (const l of vendasConcluidas) {
        const d = new Date(l.data_venda!);
        if (Number.isNaN(d.getTime())) continue;
        const key = ymd(d);
        if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
      }

      return days.map((d) => {
        const key = ymd(d);
        return {
          label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`,
          vendas: map.get(key) || 0,
        };
      });
    }

    if (serieVendasMode === "mes") {
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const map = new Map<number, number>();
      for (let day = 1; day <= daysInMonth; day++) map.set(day, 0);

      for (const l of vendasConcluidas) {
        const d = new Date(l.data_venda!);
        if (Number.isNaN(d.getTime())) continue;
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        map.set(d.getDate(), (map.get(d.getDate()) || 0) + 1);
      }

      return Array.from({ length: daysInMonth }, (_, idx) => {
        const day = idx + 1;
        return { label: pad2(day), vendas: map.get(day) || 0 };
      });
    }

    {
      const year = now.getFullYear();
      const map = new Map<number, number>();
      for (let m = 0; m < 12; m++) map.set(m, 0);

      for (const l of vendasConcluidas) {
        const d = new Date(l.data_venda!);
        if (Number.isNaN(d.getTime())) continue;
        if (d.getFullYear() !== year) continue;
        map.set(d.getMonth(), (map.get(d.getMonth()) || 0) + 1);
      }

      return Array.from({ length: 12 }, (_, m) => ({
        label: monthShort(m),
        vendas: map.get(m) || 0,
      }));
    }
  }, [serieVendasMode, vendasConcluidas]);

  // ----------------- métricas (cards) -----------------
  const metrics = [
    {
      title: "Leads Abordados",
      value: totalLeads,
      icon: Users,
      hint: "Entradas no período",
      accent: "blue",
      info: "Número total de leads que entraram no funil durante o período filtrado.",
    },
    {
      title: "Vendas Fechadas",
      value: vendasFechadas,
      icon: CheckCircle2,
      hint: "Status Concluído",
      accent: "emerald",
      info: "Número total de vendas concluídas no período filtrado.",
    },
    {
      title: "Taxa de Qualificação",
      value: `${taxaQualificacao.toFixed(1)}%`,
      icon: Target,
      hint: "Qualificados / Leads",
      accent: "amber",
      info: "Mostra a proporção de leads que avançaram para estágios mais sérios no funil de vendas.",
    },
    {
      title: "Taxa de Fechamento",
      value: `${taxaFechamento.toFixed(1)}%`,
      icon: TrendingUp,
      hint: "Vendas / Leads",
      accent: "emerald",
      info: "Reflete a eficácia do processo de vendas em converter leads abordados em vendas reais.",
    },
  ] as const;

  const accentMap: Record<
    string,
    { dot: string; ring: string; iconBg: string; iconColor: string; glow: string }
  > = {
    violet: {
      dot: "bg-violet-500",
      ring: "ring-violet-500/20",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600 dark:text-violet-400",
      glow: "from-violet-500/10",
    },
    blue: {
      dot: "bg-blue-500",
      ring: "ring-blue-500/20",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
      glow: "from-blue-500/10",
    },
    emerald: {
      dot: "bg-emerald-500",
      ring: "ring-emerald-500/20",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      glow: "from-emerald-500/10",
    },
    sky: {
      dot: "bg-sky-500",
      ring: "ring-sky-500/20",
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-600 dark:text-sky-400",
      glow: "from-sky-500/10",
    },
    amber: {
      dot: "bg-amber-500",
      ring: "ring-amber-500/20",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
      glow: "from-amber-500/10",
    },
  };

  // ----------------- dados charts/tabela -----------------
  const topEstadosData = useMemo(() => {
    const vendasPorEstado = filteredLeads
      .filter((l) => l.status === "Concluído")
      .reduce((acc, lead) => {
        const key = lead.estado || "N/D";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(vendasPorEstado)
      .map(([estado, vendas]) => ({ estado, vendas }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 10);
  }, [filteredLeads]);

  const estadosTabela = useMemo(() => {
    const estadosData = filteredLeads.reduce((acc, lead) => {
      const key = lead.estado || "N/D";
      if (!acc[key]) acc[key] = { qualificados: 0, vendas: 0 };

      const ehQualificado = ["Avaliando", "Fechamento", "Concluído"].includes(
        lead.status
      );
      if (ehQualificado) acc[key].qualificados++;

      if (lead.status === "Concluído") acc[key].vendas++;

      return acc;
    }, {} as Record<string, { qualificados: number; vendas: number }>);

    return Object.entries(estadosData)
      .map(([estado, data]) => {
        const taxa =
          data.qualificados > 0 ? (data.vendas / data.qualificados) * 100 : 0;
        return {
          estado,
          qualificados: data.qualificados,
          vendas: data.vendas,
          taxa,
        };
      })
      .sort((a, b) => b.taxa - a.taxa);
  }, [filteredLeads]);

  // ----------------- estados de loading / sem login -----------------
  if (loadingAuth) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-40 w-full rounded-2xl" />
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!firebaseUser) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-4">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold tracking-tight">
            Você precisa estar logado para ver o dashboard.
          </p>
          <p className="text-sm text-muted-foreground">
            Acesse a tela de login e entre com sua conta.
          </p>
        </div>
      </Layout>
    );
  }

  const showSkeleton = loading;

  return (
    <Layout>
      {/* ambient background — gradient mesh sutil */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10 overflow-hidden"
        >
          <div className="absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-10 left-10 h-[280px] w-[280px] rounded-full bg-violet-500/[0.06] blur-3xl" />
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          {/* HEADER */}
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="uppercase tracking-wider">Painel ao vivo</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{periodoLabel}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Dashboard de Performance
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl">
                Visão geral do período, com foco em conversão e retorno rápido.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {qtdLeadsParaRetorno > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-3 py-1.5 text-xs font-medium shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  <span>
                    {qtdLeadsParaRetorno} retorno
                    {qtdLeadsParaRetorno > 1 ? "s" : ""} pendente
                    {qtdLeadsParaRetorno > 1 ? "s" : ""}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-3 py-1.5 text-xs font-medium shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Tudo em dia</span>
                </div>
              )}
              {/* Nível badge */}
              {nivelInfo && (
                <Link href="/dashboard/nivel">
                  <div
                    className="inline-flex items-center gap-3 rounded-2xl px-4 py-2.5 font-bold transition-all duration-200 hover:scale-105 hover:brightness-110 cursor-pointer relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, ${nivelInfo.color} 18%, transparent), color-mix(in srgb, ${nivelInfo.color} 8%, transparent))`,
                      border: `1.5px solid color-mix(in srgb, ${nivelInfo.color} 55%, transparent)`,
                      color: nivelInfo.color,
                      boxShadow: `0 0 18px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 40px color-mix(in srgb, var(--primary) 12%, transparent), inset 0 1px 0 color-mix(in srgb, var(--primary) 25%, transparent)`,
                    }}
                  >
                    <nivelInfo.Icon className="h-5 w-5 shrink-0" />
                    <div className="flex flex-col leading-none gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
                        Nível {nivelInfo.number}
                      </span>
                      <span className="text-sm">{nivelInfo.name}</span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 opacity-50 shrink-0" />
                  </div>
                </Link>
              )}
            </div>
          </header>

          {/* FILTROS - barra compacta */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border bg-background/60 backdrop-blur-sm p-3 shadow-sm">
            <div className="flex items-center gap-2 px-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Filtros
              </span>
            </div>

            <div className="h-px sm:h-6 sm:w-px bg-border sm:mx-1" />

            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                <SelectTrigger className="bg-background border-muted-foreground/20 sm:max-w-[220px]">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas as origens</SelectItem>
                  <SelectItem value="Lead Novo">Apenas Leads Novos</SelectItem>
                  <SelectItem value="Retrabalho">Apenas Retrabalhos</SelectItem>
                  <SelectItem value="Ligação">Apenas Ligações</SelectItem>
                  <SelectItem value="Indicação">Apenas Indicações</SelectItem>
                  <SelectItem value="Presencial">Apenas Presenciais</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex flex-col gap-2 flex-1">
                <Tabs
                  value={filtroPeriodo}
                  onValueChange={setFiltroPeriodo}
                  className="flex-1"
                >
                  <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex">
                    <TabsTrigger value="este-mes">Este mês</TabsTrigger>
                    <TabsTrigger value="mes-passado">Mês passado</TabsTrigger>
                    <TabsTrigger value="ultimos-90">90 dias</TabsTrigger>
                    <TabsTrigger value="personalizado">Intervalo</TabsTrigger>
                  </TabsList>
                </Tabs>

                {filtroPeriodo === "personalizado" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="date"
                      value={filtroDataInicio}
                      onChange={(e) => setFiltroDataInicio(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <input
                      type="date"
                      value={filtroDataFim}
                      min={filtroDataInicio || undefined}
                      onChange={(e) => setFiltroDataFim(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* HERO + STATS LATERAIS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card de comissão - hero (2 cols) */}
            <Card className="lg:col-span-2 relative overflow-hidden border-0 shadow-xl shadow-primary/5 bg-gradient-to-br from-foreground via-foreground to-foreground/95 text-background dark:from-card dark:via-card dark:to-card/95 dark:text-foreground">
              {/* Efeito mesh */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 0%, hsl(var(--primary) / 0.4), transparent 50%), radial-gradient(circle at 80% 100%, rgb(16 185 129 / 0.3), transparent 50%)",
                }}
              />
              {/* Grid pattern */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              <CardContent className="relative p-6 md:p-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-background/10 backdrop-blur px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
                      <DollarSign className="h-3 w-3" />
                      Comissão acumulada
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 opacity-60 hover:opacity-100 transition-opacity cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px]">
                          <p className="text-xs">
                            Soma do valor de comissão de todas as vendas com status
                            Concluído cuja data de venda cai dentro do período e
                            origem filtrados.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs opacity-60">
                      No período selecionado
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider opacity-60 inline-flex items-center gap-1 justify-end">
                      Ticket médio
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 opacity-60 hover:opacity-100 transition-opacity cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px]">
                          <p className="text-xs">
                            Comissão acumulada dividida pelo número de vendas
                            fechadas no período.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </p>
                    {showSkeleton ? (
                      <Skeleton className="h-5 w-20 mt-1 bg-background/10" />
                    ) : (
                      <p className="text-sm font-semibold tabular-nums">
                        {ticketMedioFmt}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  {showSkeleton ? (
                    <Skeleton className="h-14 w-64 bg-background/10" />
                  ) : (
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <p className="text-4xl md:text-5xl font-bold tracking-tight tabular-nums">
                        {comissoesFmt}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {vendasFechadas} venda{vendasFechadas !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* mini chart de tendência */}
                {!showSkeleton && vendasSerieData.length > 0 && (
                  <div className="h-16 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={vendasSerieData}
                        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="heroGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="rgb(16 185 129)"
                              stopOpacity={0.5}
                            />
                            <stop
                              offset="100%"
                              stopColor="rgb(16 185 129)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="vendas"
                          stroke="rgb(16 185 129)"
                          strokeWidth={2}
                          fill="url(#heroGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="opacity-70">Taxa de fechamento</span>
                    <span className="font-semibold tabular-nums">
                      {showSkeleton ? "..." : `${taxaFechamento.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-background/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, taxaFechamento)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats laterais */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <Card className="overflow-hidden group hover:shadow-md transition-all duration-300 border-muted-foreground/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                      Convertido
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px]">
                          <p className="text-xs">
                            Número de leads com status Concluído cuja data de venda
                            cai dentro do período e origem filtrados.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </div>
                  {showSkeleton ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight">
                      {vendasFechadas}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Vendas fechadas
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden group hover:shadow-md transition-all duration-300 border-muted-foreground/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <Activity className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                      Pipeline
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px]">
                          <p className="text-xs">
                            Leads com status Avaliando, Fechamento ou Concluído
                            dentro do período e origem filtrados.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </div>
                  {showSkeleton ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight">
                      {leadsQualificados}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Leads qualificados
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* GRÁFICO DE VENDAS COMPLETO */}
          <Card className="overflow-hidden border-muted-foreground/10 shadow-sm">
            <CardHeader className="pb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold tracking-tight">
                  Histórico de Vendas
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Evolução das vendas concluídas — independente do filtro de
                  período acima.
                </p>
              </div>

              <Tabs
                value={serieVendasMode}
                onValueChange={(v) => setSerieVendasMode(v as SerieVendasMode)}
              >
                <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex">
                  <TabsTrigger value="semana">7d</TabsTrigger>
                  <TabsTrigger value="mes">Mês</TabsTrigger>
                  <TabsTrigger value="ano">Ano</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="pt-4">
              {showSkeleton ? (
                <Skeleton className="h-[260px] w-full" />
              ) : vendasSerieData.length === 0 ||
                vendasSerieData.every((d) => d.vendas === 0) ? (
                <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sem vendas concluídas suficientes para gerar a série.
                  </p>
                </div>
              ) : (
                <ChartContainer
                  config={{
                    vendas: { label: "Vendas", color: "hsl(var(--primary))" },
                  }}
                  className="h-[260px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={vendasSerieData}
                      margin={{ top: 10, right: 14, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="lineGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--primary)"
                            stopOpacity={1}
                          />
                          <stop
                            offset="100%"
                            stopColor="rgb(16 185 129)"
                            stopOpacity={1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="vendas"
                        stroke="url(#lineGradient)"
                        strokeWidth={2.5}
                        dot={{ r: 0 }}
                        activeDot={{
                          r: 5,
                          strokeWidth: 2,
                          stroke: "hsl(var(--background))",
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Métricas - grid */}
          <div>
            <div className="flex items-baseline justify-between mb-4 px-1">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                Métricas-chave
              </h2>
              <span className="text-xs text-muted-foreground">
                {metrics.length} indicadores
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((m) => {
                const Icon = m.icon;
                const accent = accentMap[m.accent];
                return (
                  <Card
                    key={m.title}
                    className="group relative overflow-hidden border-muted-foreground/10 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {/* glow no hover */}
                    <div
                      className={`absolute inset-0 -z-10 bg-gradient-to-br ${accent.glow} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${accent.dot}`}
                            />
                            <p className="text-xs font-medium text-muted-foreground truncate">
                              {m.title}
                            </p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-[240px]"
                              >
                                <p className="text-xs">{m.info}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          {showSkeleton ? (
                            <Skeleton className="h-9 w-24" />
                          ) : (
                            <p className="text-3xl font-bold tracking-tight tabular-nums">
                              {m.value}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/80">
                            {m.hint}
                          </p>
                        </div>

                        <div
                          className={`h-10 w-10 rounded-xl ${accent.iconBg} ring-1 ${accent.ring} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300`}
                        >
                          <Icon className={`h-5 w-5 ${accent.iconColor}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* RETORNOS PENDENTES */}
          <Card className="border-muted-foreground/10 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0 border-b">
              <div className="flex items-start gap-3">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    qtdLeadsParaRetorno > 0
                      ? "bg-amber-500/10 ring-1 ring-amber-500/20"
                      : "bg-emerald-500/10 ring-1 ring-emerald-500/20"
                  }`}
                >
                  <Clock
                    className={`h-5 w-5 ${
                      qtdLeadsParaRetorno > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">
                    Retornos Pendentes
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {qtdLeadsParaRetorno > 0
                      ? `${qtdLeadsParaRetorno} lead${
                          qtdLeadsParaRetorno > 1 ? "s" : ""
                        } aguardando contato há mais de 24h`
                      : "Nenhum lead pendente de retorno há mais de 24h"}
                  </p>
                </div>
              </div>
              {qtdLeadsParaRetorno > 0 && (
                <Badge
                  variant="default"
                  className="bg-amber-500 hover:bg-amber-500 text-white border-0 shrink-0"
                >
                  Prioridade alta
                </Badge>
              )}
            </CardHeader>

            <CardContent className="p-5">
              {qtdLeadsParaRetorno > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {leadsParaRetorno.slice(0, 8).map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      firebaseUser={{
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                      }}
                      onRefreshLeads={fetchLeads}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium mb-1">
                    Sua agenda está em dia
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Dica: mantenha esse painel zerado retornando primeiro os
                    leads em{" "}
                    <span className="font-medium text-foreground">
                      Cotação
                    </span>{" "}
                    e{" "}
                    <span className="font-medium text-foreground">
                      Avaliando
                    </span>
                    .
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CHARTS + TABELA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 10 estados */}
            <Card className="border-muted-foreground/10 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold tracking-tight">
                      Top 10 Estados
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Onde você mais fecha no período selecionado.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showSkeleton ? (
                  <Skeleton className="h-[340px] w-full" />
                ) : topEstadosData.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
                    <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sem vendas concluídas no período para montar o gráfico.
                    </p>
                  </div>
                ) : (
                  <ChartContainer
                    config={{
                      vendas: { label: "Vendas", color: "hsl(var(--primary))" },
                    }}
                    className="h-[340px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topEstadosData}
                        margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="barGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--primary)"
                              stopOpacity={1}
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--primary)"
                              stopOpacity={0.6}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="estado"
                          tickLine={false}
                          axisLine={false}
                          fontSize={11}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          fontSize={11}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="vendas"
                          radius={[6, 6, 0, 0]}
                          fill="url(#barGradient)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Tabela - taxa por estado */}
            <Card className="border-muted-foreground/10 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="inline-flex items-center gap-1.5 text-base font-semibold tracking-tight">
                      Taxa de Fechamento por Estado
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px]">
                          <p className="text-xs">
                            Para cada estado: vendas concluídas dividido por leads
                            qualificados (Avaliando, Fechamento ou Concluído) no
                            período filtrado, em %.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Conversão (vendas / qualificados) por UF.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {showSkeleton ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : estadosTabela.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
                    <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Target className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sem dados suficientes no período.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[340px] overflow-auto rounded-xl border bg-background/50">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10">
                        <TableRow className="hover:bg-transparent border-b">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Estado
                          </TableHead>
                          <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Qualif.
                          </TableHead>
                          <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Vendas
                          </TableHead>
                          <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Taxa
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {estadosTabela.map((row) => {
                          const taxaColor =
                            row.taxa >= 20
                              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 ring-emerald-500/20"
                              : row.taxa >= 10
                              ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 ring-amber-500/20"
                              : "text-muted-foreground bg-muted ring-border";

                          return (
                            <TableRow
                              key={row.estado}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="font-semibold tracking-tight">
                                {row.estado}
                              </TableCell>
                              <TableCell className="text-center tabular-nums text-muted-foreground">
                                {row.qualificados}
                              </TableCell>
                              <TableCell className="text-center tabular-nums font-medium">
                                {row.vendas}
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ${taxaColor}`}
                                >
                                  {row.taxa.toFixed(1)}%
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* footer espaçamento */}
          <div className="h-4" />
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;