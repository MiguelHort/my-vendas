"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  Eye,
  MousePointerClick,
  Percent,
  Target,
  Users,
  AlertCircle,
  Megaphone,
  Filter,
  Search,
  BarChart3,
} from "lucide-react";

type Level = "campaign" | "ad";

type AdsRow = {
  campaign_id: string | null;
  campaign_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  date: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  leads: number;
  cost_per_lead: number | null;
};

const PERIODO_OPTIONS = [
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "ultimos-7", label: "Últimos 7 dias" },
  { value: "ultimos-30", label: "Últimos 30 dias" },
  { value: "este-mes", label: "Este mês" },
  { value: "mes-passado", label: "Mês passado" },
  { value: "personalizado", label: "Personalizado" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatCurrencyCompact(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}
function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
function formatDayLabel(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export default function AnunciosPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [periodo, setPeriodo] = useState("ultimos-7");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [level, setLevel] = useState<Level>("campaign");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [summary, setSummary] = useState<AdsRow | null>(null);
  const [campaignRows, setCampaignRows] = useState<AdsRow[]>([]);
  const [adRows, setAdRows] = useState<AdsRow[]>([]);
  const [dailySeries, setDailySeries] = useState<AdsRow[]>([]);
  const [convByAd, setConvByAd] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { since, until } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (periodo) {
      case "hoje":
        return { since: ymd(today), until: ymd(today) };
      case "ontem": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { since: ymd(y), until: ymd(y) };
      }
      case "ultimos-30": {
        const s = new Date(today);
        s.setDate(s.getDate() - 29);
        return { since: ymd(s), until: ymd(today) };
      }
      case "este-mes": {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        return { since: ymd(s), until: ymd(today) };
      }
      case "mes-passado": {
        const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const e = new Date(today.getFullYear(), today.getMonth(), 0);
        return { since: ymd(s), until: ymd(e) };
      }
      case "personalizado":
        return { since: dataInicio, until: dataFim };
      case "ultimos-7":
      default: {
        const s = new Date(today);
        s.setDate(s.getDate() - 6);
        return { since: ymd(s), until: ymd(today) };
      }
    }
  }, [periodo, dataInicio, dataFim]);

  const periodoLabel = useMemo(
    () => PERIODO_OPTIONS.find((o) => o.value === periodo)?.label ?? "Período",
    [periodo]
  );

  const authHeader = useCallback(async () => {
    if (!firebaseUser) return null;
    const token = await firebaseUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [firebaseUser]);

  const fetchInsights = useCallback(async () => {
    if (!since || !until) return;
    const headers = await authHeader();
    if (!headers) return;

    setLoading(true);
    setError(null);
    try {
      const qs = (extra: string) => `since=${since}&until=${until}&${extra}`;
      const [summaryRes, campaignsRes, seriesRes, adsRes, convRes] = await Promise.all([
        fetch(`/api/meta/ads-insights?${qs("level=account")}`, { headers }),
        fetch(`/api/meta/ads-insights?${qs("level=campaign")}`, { headers }),
        fetch(`/api/meta/ads-insights?${qs("level=account&time_increment=1")}`, { headers }),
        level === "ad"
          ? fetch(`/api/meta/ads-insights?${qs("level=ad")}`, { headers })
          : Promise.resolve(null),
        // conversas de WhatsApp por anúncio (dado nosso; se falhar, só some a coluna)
        fetch(`/api/meta/ads-conversations?since=${since}&until=${until}`, { headers }).catch(() => null),
      ]);

      const summaryData = await summaryRes.json();
      const campaignsData = await campaignsRes.json();
      const seriesData = await seriesRes.json();
      const adsData = adsRes ? await adsRes.json() : { rows: [] };

      if (!summaryRes.ok || !campaignsRes.ok || !seriesRes.ok || (adsRes && !adsRes.ok)) {
        throw new Error(
          summaryData.error || campaignsData.error || seriesData.error || adsData.error ||
            "Erro ao consultar a Meta"
        );
      }

      const convData = convRes && convRes.ok ? await convRes.json().catch(() => null) : null;
      setConvByAd(
        Object.fromEntries(
          ((convData?.rows ?? []) as { ad_id: string; conversations: number }[]).map((r) => [
            r.ad_id,
            r.conversations,
          ])
        )
      );

      setSummary(summaryData.rows?.[0] ?? null);
      setCampaignRows(
        [...(campaignsData.rows ?? [])].sort((a: AdsRow, b: AdsRow) => b.spend - a.spend)
      );
      setAdRows([...(adsData.rows ?? [])].sort((a: AdsRow, b: AdsRow) => b.spend - a.spend));
      setDailySeries(
        [...(seriesData.rows ?? [])].sort((a: AdsRow, b: AdsRow) =>
          (a.date ?? "").localeCompare(b.date ?? "")
        )
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao consultar a Meta");
      setSummary(null);
      setCampaignRows([]);
      setAdRows([]);
      setDailySeries([]);
      setConvByAd({});
    } finally {
      setLoading(false);
    }
  }, [authHeader, since, until, level]);

  useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    fetchInsights();
  }, [firebaseUser, loadingAuth, fetchInsights]);

  // volta pro "todas as campanhas" sempre que sair da visão por anúncio
  useEffect(() => {
    if (level !== "ad") setCampaignFilter("all");
  }, [level]);

  const tableRows = useMemo(() => {
    const base = level === "campaign" ? campaignRows : adRows;
    const byCampaign =
      level === "ad" && campaignFilter !== "all"
        ? base.filter((r) => r.campaign_id === campaignFilter)
        : base;
    const q = search.trim().toLowerCase();
    if (!q) return byCampaign;
    return byCampaign.filter((r) => {
      const name = (level === "campaign" ? r.campaign_name : r.ad_name) || "";
      return name.toLowerCase().includes(q);
    });
  }, [level, campaignRows, adRows, campaignFilter, search]);

  const spendByCampaignChart = useMemo(
    () =>
      campaignRows
        .slice(0, 8)
        .map((r) => ({ name: r.campaign_name || "—", spend: r.spend })),
    [campaignRows]
  );

  const dailyChartData = useMemo(
    () =>
      dailySeries.map((r) => ({
        day: r.date ? formatDayLabel(r.date) : "",
        spend: r.spend,
        clicks: r.clicks,
        leads: r.leads,
      })),
    [dailySeries]
  );

  if (loadingAuth) return null;

  const isConfigError = !!error && /não configurad/i.test(error);

  return (
    <Layout>
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10 overflow-hidden"
        >
          <div className="absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          {/* HEADER */}
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                <span className="uppercase tracking-wider">Meta Ads</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{periodoLabel}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Anúncios</h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl">
                Métricas da conta de anúncios do Meta (Facebook/Instagram Ads).
              </p>
            </div>

            <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
              <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </header>

          {/* FILTROS */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border bg-background/60 backdrop-blur-sm p-3 shadow-sm">
            <div className="flex items-center gap-2 px-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Filtros
              </span>
            </div>

            <div className="h-px sm:h-6 sm:w-px bg-border sm:mx-1" />

            <div className="flex flex-1 flex-col sm:flex-row flex-wrap gap-3">
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="bg-background border-muted-foreground/20 sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {periodo === "personalizado" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-38 bg-background"
                  />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input
                    type="date"
                    value={dataFim}
                    min={dataInicio || undefined}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-38 bg-background"
                  />
                </div>
              )}

              <Tabs value={level} onValueChange={(v) => setLevel(v as Level)}>
                <TabsList>
                  <TabsTrigger value="campaign">Por campanha</TabsTrigger>
                  <TabsTrigger value="ad">Por anúncio</TabsTrigger>
                </TabsList>
              </Tabs>

              {level === "ad" && campaignRows.length > 0 && (
                <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                  <SelectTrigger className="bg-background border-muted-foreground/20 sm:w-56">
                    <SelectValue placeholder="Todas as campanhas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as campanhas</SelectItem>
                    {campaignRows
                      .filter((c): c is AdsRow & { campaign_id: string } => !!c.campaign_id)
                      .map((c) => (
                        <SelectItem key={c.campaign_id} value={c.campaign_id}>
                          {c.campaign_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}

              <div className="relative flex-1 sm:max-w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={level === "campaign" ? "Buscar campanha" : "Buscar anúncio"}
                  className="pl-9 bg-background border-muted-foreground/20"
                />
              </div>
            </div>
          </div>

          {error ? (
            <Card className="border-destructive/30">
              <CardContent className="flex items-start gap-3 py-6">
                <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    Não foi possível carregar as métricas
                  </p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  {isConfigError && (
                    <p className="text-xs text-muted-foreground">
                      Configure <code className="font-mono">META_AD_ACCOUNT_ID</code> e{" "}
                      <code className="font-mono">META_ADS_ACCESS_TOKEN</code> nas variáveis de
                      ambiente (token de usuário do sistema com permissão{" "}
                      <code className="font-mono">ads_read</code>).
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* CARDS DE RESUMO */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  icon={DollarSign}
                  label="Gasto"
                  value={loading ? null : formatCurrency(summary?.spend ?? 0)}
                  accent="emerald"
                />
                <SummaryCard
                  icon={Eye}
                  label="Impressões"
                  value={loading ? null : formatNumber(summary?.impressions ?? 0)}
                  accent="blue"
                />
                <SummaryCard
                  icon={MousePointerClick}
                  label="Cliques"
                  value={loading ? null : formatNumber(summary?.clicks ?? 0)}
                  accent="violet"
                />
                <SummaryCard
                  icon={Percent}
                  label="CTR"
                  value={loading ? null : formatPercent(summary?.ctr ?? 0)}
                  accent="amber"
                />
                <SummaryCard
                  icon={DollarSign}
                  label="CPC"
                  value={loading ? null : formatCurrency(summary?.cpc ?? 0)}
                  accent="emerald"
                />
                <SummaryCard
                  icon={Users}
                  label="Leads"
                  value={loading ? null : formatNumber(summary?.leads ?? 0)}
                  accent="rose"
                  hint="Estimado a partir das ações de conversão da Meta"
                />
                <SummaryCard
                  icon={Target}
                  label="Custo por lead"
                  value={
                    loading
                      ? null
                      : summary?.cost_per_lead != null
                        ? formatCurrency(summary.cost_per_lead)
                        : "—"
                  }
                  accent="rose"
                />
                <SummaryCard
                  icon={Eye}
                  label="Alcance"
                  value={loading ? null : formatNumber(summary?.reach ?? 0)}
                  accent="blue"
                />
              </div>

              {/* GRÁFICOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-muted-foreground/10 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                        <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold tracking-tight">
                          Gasto por dia
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Investimento diário no período selecionado.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-[260px] w-full" />
                    ) : dailyChartData.length === 0 ? (
                      <EmptyChart icon={DollarSign} text="Sem gasto no período." />
                    ) : (
                      <ChartContainer
                        config={{ spend: { label: "Gasto", color: "hsl(var(--primary))" } }}
                        className="h-[260px] w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dailyChartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                              dataKey="day"
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
                              tickFormatter={(v: number | string) => formatCurrencyCompact(Number(v))}
                              width={64}
                            />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent formatter={(value: number | string) => formatCurrency(Number(value))} />
                              }
                            />
                            <Area
                              type="monotone"
                              dataKey="spend"
                              stroke="var(--primary)"
                              strokeWidth={2.5}
                              fill="url(#spendGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-muted-foreground/10 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center shrink-0">
                        <MousePointerClick className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold tracking-tight">
                          Cliques e leads por dia
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Volume diário — mesma escala (contagem).
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-[260px] w-full" />
                    ) : dailyChartData.length === 0 ? (
                      <EmptyChart icon={MousePointerClick} text="Sem atividade no período." />
                    ) : (
                      <ChartContainer
                        config={{
                          clicks: { label: "Cliques", color: "#8b5cf6" },
                          leads: { label: "Leads", color: "#f43f5e" },
                        }}
                        className="h-[260px] w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyChartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                              dataKey="day"
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
                              width={32}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Line
                              type="monotone"
                              dataKey="clicks"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              dot={{ r: 0 }}
                              activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                            />
                            <Line
                              type="monotone"
                              dataKey="leads"
                              stroke="#f43f5e"
                              strokeWidth={2}
                              dot={{ r: 0 }}
                              activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-muted-foreground/10 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
                      <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold tracking-tight">
                        Gasto por campanha
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Top 8 campanhas por investimento no período.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[280px] w-full" />
                  ) : spendByCampaignChart.length === 0 ? (
                    <EmptyChart icon={BarChart3} text="Sem campanhas ativas no período." />
                  ) : (
                    <ChartContainer
                      config={{ spend: { label: "Gasto", color: "hsl(var(--primary))" } }}
                      className="w-full"
                      style={{ height: Math.max(140, spendByCampaignChart.length * 40) }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={spendByCampaignChart}
                          layout="vertical"
                          margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                        >
                          <defs>
                            <linearGradient id="campaignBarGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity={1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                          <XAxis
                            type="number"
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            stroke="hsl(var(--muted-foreground))"
                            tickFormatter={(v: number | string) => formatCurrencyCompact(Number(v))}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            stroke="hsl(var(--muted-foreground))"
                            width={180}
                            tick={{ width: 170 }}
                          />
                          <ChartTooltip
                            content={<ChartTooltipContent formatter={(value: number | string) => formatCurrency(Number(value))} />}
                          />
                          <Bar dataKey="spend" radius={[0, 6, 6, 0]} fill="url(#campaignBarGradient)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* TABELA */}
              <Card className="border-muted-foreground/10 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold tracking-tight">
                    {level === "campaign" ? "Campanhas" : "Anúncios"} no período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                      ))}
                    </div>
                  ) : tableRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Nenhuma atividade encontrada pro filtro selecionado.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{level === "campaign" ? "Campanha" : "Anúncio"}</TableHead>
                            <TableHead className="text-right">Gasto</TableHead>
                            <TableHead className="text-right">Impressões</TableHead>
                            <TableHead className="text-right">Cliques</TableHead>
                            <TableHead className="text-right">CTR</TableHead>
                            <TableHead className="text-right">CPC</TableHead>
                            <TableHead className="text-right">Leads</TableHead>
                            <TableHead className="text-right">Custo/lead</TableHead>
                            {level === "ad" && (
                              <>
                                <TableHead className="text-right">Conversas WhatsApp</TableHead>
                                <TableHead className="text-right">Custo/conversa</TableHead>
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableRows.map((r, i) => (
                            <TableRow key={r.ad_id ?? r.campaign_id ?? i}>
                              <TableCell className="font-medium max-w-64 truncate">
                                {(level === "campaign" ? r.campaign_name : r.ad_name) || "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(r.spend)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatNumber(r.impressions)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatNumber(r.clicks)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatPercent(r.ctr)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(r.cpc)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatNumber(r.leads)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {r.cost_per_lead != null ? formatCurrency(r.cost_per_lead) : "—"}
                              </TableCell>
                              {level === "ad" && (
                                <>
                                  <TableCell className="text-right tabular-nums">
                                    {formatNumber(r.ad_id ? (convByAd[r.ad_id] ?? 0) : 0)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {r.ad_id && (convByAd[r.ad_id] ?? 0) > 0
                                      ? formatCurrency(r.spend / convByAd[r.ad_id])
                                      : "—"}
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function EmptyChart({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  accent: "emerald" | "blue" | "violet" | "amber" | "rose";
  hint?: string;
}) {
  const accentClasses: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20",
  };

  return (
    <Card className="border-muted-foreground/10 shadow-sm">
      <CardContent className="py-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className={`h-7 w-7 rounded-lg ring-1 flex items-center justify-center ${accentClasses[accent]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        {value === null ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <p className="text-lg font-bold tabular-nums">{value}</p>
        )}
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
