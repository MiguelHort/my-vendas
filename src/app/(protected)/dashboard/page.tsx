// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Layout } from "@/components/Layout";
import LeadCard, { Lead as FunilLead } from "@/components/LeadCard";

import { toast } from "sonner";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  ThumbsUp,
  CheckCircle2,
  MapPin,
  Package,
  Sparkles,
  Clock,
  ArrowUpRight,
  Info,
} from "lucide-react";

// shadcn ui
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
} from "recharts";
import { info } from "console";

type Lead = FunilLead;

type LoteProducaoResumo = {
  volume_total_chamado: number | null;
  qtd_leads_novos: number | null;
  qtd_retrabalhos: number | null;
  qtd_ligacao: number | null;
  qtd_indicacao: number | null;
  qtd_presencial: number | null;
};

type SerieVendasMode = "semana" | "mes" | "ano";

const DashboardPage = () => {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [volumeProducao, setVolumeProducao] = useState<number>(0);
  const [filtroOrigem, setFiltroOrigem] = useState<string>("Todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("este-mes");
  const [loading, setLoading] = useState(true);
  const [loadingVolume, setLoadingVolume] = useState(true);

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
    }

    return { startDate, endDate };
  };

  const isLeadAtivo = (status: string) =>
    ["Abordagem", "Avaliando", "Fechamento"].includes(status);

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
    // 0..11
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

  // ----------------- fetch Volume Produção -----------------
  const fetchVolumeProducao = async () => {
    if (!firebaseUser) return;

    setLoadingVolume(true);
    const { startDate, endDate } = getDateRange();

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      const res = await fetch(
        `/api/dashboard/lotes-producao?${params.toString()}`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Erro ao carregar volume de produção:", body);
        setVolumeProducao(0);
        return;
      }

      const data: LoteProducaoResumo[] = await res.json();

      let total = 0;

      if (!data || data.length === 0) {
        total = 0;
      } else {
        switch (filtroOrigem) {
          case "Todos":
            total = data.reduce(
              (sum, lote) => sum + (lote.volume_total_chamado || 0),
              0
            );
            break;
          case "Lead Novo":
            total = data.reduce(
              (sum, lote) => sum + (lote.qtd_leads_novos || 0),
              0
            );
            break;
          case "Retrabalho":
            total = data.reduce(
              (sum, lote) => sum + (lote.qtd_retrabalhos || 0),
              0
            );
            break;
          case "Ligação":
            total = data.reduce(
              (sum, lote) => sum + (lote.qtd_ligacao || 0),
              0
            );
            break;
          case "Indicação":
            total = data.reduce(
              (sum, lote) => sum + (lote.qtd_indicacao || 0),
              0
            );
            break;
          case "Presencial":
            total = data.reduce(
              (sum, lote) => sum + (lote.qtd_presencial || 0),
              0
            );
            break;
          default:
            total = data.reduce(
              (sum, lote) => sum + (lote.volume_total_chamado || 0),
              0
            );
        }
      }

      setVolumeProducao(total);
    } catch (error) {
      console.error("Erro ao carregar volume de produção:", error);
      setVolumeProducao(0);
    } finally {
      setLoadingVolume(false);
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
    fetchVolumeProducao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, loadingAuth, filtroPeriodo, filtroOrigem]);

  // ----------------- métricas (filtradas pelo filtroPeriodo/origem) -----------------
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
  }, [leads, filtroOrigem, filtroPeriodo]);

  const totalLeads = filteredLeads.length;
  const vendasFechadas = filteredLeads.filter(
    (l) => l.status === "Concluído"
  ).length;

  const totalComissoes = filteredLeads
    .filter((l) => l.status === "Concluído")
    .reduce((acc, l) => acc + (l.valor_comissao || 0), 0);

  const leadsQualificados = filteredLeads.filter((l) =>
    ["Avaliando", "Fechamento", "Concluído"].includes(l.status)
  ).length;

  const taxaResposta =
    volumeProducao > 0 ? (totalLeads / volumeProducao) * 100 : 0;
  const taxaQualificacao =
    totalLeads > 0 ? (leadsQualificados / totalLeads) * 100 : 0;

  // mantive a sua fórmula atual
  const taxaFechamento =
    leadsQualificados > 0 ? (vendasFechadas / volumeProducao) * 100 : 0;

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

  const comissoesFmt = (totalComissoes ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // ----------------- Série de vendas (sempre baseado no "ano/mês/semana atual", independente do filtroPeriodo) -----------------
  const vendasConcluidas = useMemo(() => {
    return leads.filter((l) => l.status === "Concluído");
  }, [leads]);

  const vendasSerieData = useMemo(() => {
    const now = new Date();

    if (serieVendasMode === "semana") {
      // últimos 7 dias (inclui hoje)
      const days: Date[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push(d);
      }

      const map = new Map<string, number>();
      for (const d of days) map.set(ymd(d), 0);

      for (const l of vendasConcluidas) {
        const d = new Date(l.data_entrada);
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
        const d = new Date(l.data_entrada);
        if (Number.isNaN(d.getTime())) continue;
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        map.set(d.getDate(), (map.get(d.getDate()) || 0) + 1);
      }

      return Array.from({ length: daysInMonth }, (_, idx) => {
        const day = idx + 1;
        return { label: pad2(day), vendas: map.get(day) || 0 };
      });
    }

    // ano
    {
      const year = now.getFullYear();
      const map = new Map<number, number>();
      for (let m = 0; m < 12; m++) map.set(m, 0);

      for (const l of vendasConcluidas) {
        const d = new Date(l.data_entrada);
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

  // ----------------- cards métricas com "toque" de cor -----------------
  const metrics = [
    {
      title: "Volume de Produção",
      value: volumeProducao,
      icon: Package,
      hint: "Total chamado no período",
      // toque roxo (igual você tinha)
      border: "border-l-purple-600/60",
      iconBg: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600",
      info: "Número total de leads que foram chamados no período filtrado.",
    },
    {
      title: "Leads Abordados",
      value: totalLeads,
      icon: Users,
      hint: "Entradas no período",
      // toque azul
      border: "border-l-blue-500/60",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      info: "Número total de leads que entraram no funil durante o período filtrado.",
    },
    {
      title: "Vendas Fechadas",
      value: vendasFechadas,
      icon: CheckCircle2,
      hint: "Status Concluído",
      // toque primary (igual você tinha)
      border: "border-l-primary/60",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      info: "Número total de vendas concluídas no período filtrado.",
    },
    {
      title: "Taxa de Resposta",
      value: `${taxaResposta.toFixed(1)}%`,
      icon: ThumbsUp,
      hint: "Leads / Produção",
      border: "border-l-blue-500/60",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      info: "Indica a eficiência na abordagem dos leads em relação ao volume produzido.",
    },
    {
      title: "Taxa de Qualificação",
      value: `${taxaQualificacao.toFixed(1)}%`,
      icon: Target,
      hint: "Qualificados / Leads",
      border: "border-l-blue-500/60",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      info: "Mostra a proporção de leads que avançaram para estágios mais sérios no funil de vendas.",
    },
    {
      title: "Taxa de Fechamento",
      value: `${taxaFechamento.toFixed(1)}%`,
      icon: TrendingUp,
      hint: "Vendas / Produção",
      border: "border-l-primary/60",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      info: "Reflete a eficácia do processo de vendas em converter leads qualificados em vendas reais.",
    },
  ];

  // ----------------- dados charts/tabela (filtrados) -----------------
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
        <div className="p-4 md:p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!firebaseUser) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-lg font-semibold">
            Você precisa estar logado para ver o dashboard.
          </p>
          <p className="text-sm text-muted-foreground">
            Acesse a tela de login e entre com sua conta.
          </p>
        </div>
      </Layout>
    );
  }

  const showSkeleton = loading || loadingVolume;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Dashboard de Performance
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Visão geral do período, com foco em conversão e retorno rápido.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Atualizado por filtros
            </Badge>
            {qtdLeadsParaRetorno > 0 ? (
              <Badge className="gap-1">
                <Clock className="h-3.5 w-3.5" />
                {qtdLeadsParaRetorno} pendente(s)
              </Badge>
            ) : (
              <Badge variant="outline">Sem pendências 🎉</Badge>
            )}
          </div>
        </div>

        {/* Filtros */}
        <Card className="overflow-hidden border-none shadow-none p-0 rounded-none">
          <CardContent className="space-y-4 p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Origem
                </div>
                <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Lead Novo">
                      Apenas Leads Novos
                    </SelectItem>
                    <SelectItem value="Retrabalho">
                      Apenas Retrabalhos
                    </SelectItem>
                    <SelectItem value="Ligação">Apenas Ligações</SelectItem>
                    <SelectItem value="Indicação">Apenas Indicações</SelectItem>
                    <SelectItem value="Presencial">
                      Apenas Presenciais
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Período
                </div>
                <Tabs value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="este-mes">Este mês</TabsTrigger>
                    <TabsTrigger value="mes-passado">Mês passado</TabsTrigger>
                    <TabsTrigger value="ultimos-90">90 dias</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* HERO - Comissão + gráfico abaixo */}
        <Card className="relative overflow-hidden border-primary/20">
          <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
          <CardContent className="relative p-5 md:p-6 space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Comissão no período (filtros)
                    </p>
                    {showSkeleton ? (
                      <Skeleton className="h-8 w-44 mt-1" />
                    ) : (
                      <p className="text-2xl md:text-3xl font-bold tracking-tight">
                        {comissoesFmt}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Meta visual
                  </Badge>
                  <Badge variant="secondary">Foco: conversão</Badge>
                </div>
              </div>

              <div className="w-full md:w-[320px] space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Fechamento</span>
                  <span className="font-medium text-foreground">
                    {showSkeleton ? "..." : `${taxaFechamento.toFixed(1)}%`}
                  </span>
                </div>
                <Progress value={Math.min(100, Math.max(0, taxaFechamento))} />
                <p className="text-xs text-muted-foreground">
                  Acelere fechamentos atacando “Retornos pendentes”.
                </p>
              </div>
            </div>

            <Separator className="bg-primary/10" />

            {/* gráfico de vendas (concluídos) - abaixo do card comissão */}
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Vendas (Concluídas)</p>
                  <p className="text-xs text-muted-foreground">
                    Série do tempo atual (não depende do filtro de período).
                  </p>
                </div>

                <Tabs
                  value={serieVendasMode}
                  onValueChange={(v) =>
                    setSerieVendasMode(v as SerieVendasMode)
                  }
                >
                  <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                    <TabsTrigger value="semana">Semana</TabsTrigger>
                    <TabsTrigger value="mes">Mês</TabsTrigger>
                    <TabsTrigger value="ano">Ano</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {showSkeleton ? (
                <Skeleton className="h-[260px] w-full" />
              ) : vendasSerieData.length === 0 ? (
                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Sem vendas concluídas suficientes para gerar a série.
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
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="vendas"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cards de métricas com toque de cor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <Card
                key={m.title}
                className={`hover:shadow-sm transition-shadow border-l-4 ${m.border}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <p className="flex gap-2 items-center text-sm font-medium">
                        {m.title}{" "}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{m.info}</p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      {showSkeleton ? (
                        <Skeleton className="h-8 w-24" />
                      ) : (
                        <p className="text-2xl font-bold">{m.value}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{m.hint}</p>
                    </div>

                    <div
                      className={`h-10 w-10 rounded-xl ${m.iconBg} flex items-center justify-center`}
                    >
                      <Icon className={`h-5 w-5 ${m.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Leads para retorno */}
        <Card className="border-primary/15">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Retornos pendentes</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {qtdLeadsParaRetorno > 0
                    ? `${qtdLeadsParaRetorno} lead(s) aguardando contato há mais de 24h`
                    : "Nenhum lead pendente de retorno há mais de 24h 🎉"}
                </p>
              </div>
              <Badge variant={qtdLeadsParaRetorno > 0 ? "default" : "outline"}>
                {qtdLeadsParaRetorno > 0 ? "Prioridade" : "Ok"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
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
              <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                Dica: mantenha esse card zerado retornando primeiro os leads em{" "}
                <span className="font-medium text-foreground">Abordagem</span> e{" "}
                <span className="font-medium text-foreground">Avaliando</span>.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts + Tabela */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 10 estados */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Top 10 Estados (Vendas)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Onde você mais fecha no período selecionado.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showSkeleton ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-320px w-full" />
                </div>
              ) : topEstadosData.length === 0 ? (
                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Sem vendas concluídas no período para montar o gráfico.
                </div>
              ) : (
                <ChartContainer
                  config={{
                    vendas: { label: "Vendas", color: "hsl(var(--primary))" },
                  }}
                  className="h-[380px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topEstadosData}
                      margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="estado"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="vendas"
                        radius={[8, 8, 0, 0]}
                        fill="var(--primary)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Tabela - taxa por estado */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Taxa de Fechamento por Estado
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conversão (vendas / qualificados) por UF.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {showSkeleton ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : estadosTabela.length === 0 ? (
                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  Sem dados suficientes no período para calcular taxas por
                  estado.
                </div>
              ) : (
                <div className="max-h-[380px] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">
                          Qualificados
                        </TableHead>
                        <TableHead className="text-center">Vendas</TableHead>
                        <TableHead className="text-center">Taxa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estadosTabela.map((row) => {
                        const badgeVariant =
                          row.taxa >= 20
                            ? "default"
                            : row.taxa >= 10
                            ? "secondary"
                            : "outline";

                        return (
                          <TableRow key={row.estado}>
                            <TableCell className="font-medium">
                              {row.estado}
                            </TableCell>
                            <TableCell className="text-center">
                              {row.qualificados}
                            </TableCell>
                            <TableCell className="text-center">
                              {row.vendas}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={badgeVariant}>
                                {row.taxa.toFixed(1)}%
                              </Badge>
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
      </div>
    </Layout>
  );
};

export default DashboardPage;
