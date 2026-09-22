"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipTrigger as UiTooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart3,
  Users,
  Target,
  Clock,
  MessageCircle,
  Filter,
  Info,
  AlertCircle,
  Megaphone,
  ClipboardList,
  MapPin,
  XCircle,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// ========================
// TIPOS (espelham a resposta de /api/metrics)
// ========================

type Bucket = { key: string; count: number };
type StatusBucket = { status: string; count: number; color: string };
type DiaBucket = { date: string; count: number };

type MetricsResponse = {
  period: { days: number | null; from: string | null; to: string };
  leads: {
    total: number;
    taxaConversao: number;
    tempoMedioPrimeiroContatoHoras: number | null;
    porStatus: StatusBucket[];
    porOrigem: Bucket[];
    porDispensaMotivo: Bucket[];
    porEstado: Bucket[];
    serieDiaria: DiaBucket[];
  };
  conversas: {
    total: number;
    comAnuncio: number;
    semAnuncio: number;
    porHora: { hora: number; count: number }[];
    porDiaSemana: { dia: string; count: number }[];
    serieDiaria: DiaBucket[];
    mensagensPorDia: { date: string; inbound: number; outbound: number }[];
    quiz: {
      iniciados: number;
      concluidos: number;
      interrompidos: number;
      emAndamento: number;
      taxaConclusao: number;
      porNecessidade: Bucket[];
    };
  };
};

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "all", label: "Desde o início" },
];

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function pct(v: number) {
  return `${(v * 100).toFixed(0)}%`;
}

// ========================
// PÁGINA
// ========================

export default function MetricasPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);
  const [period, setPeriod] = React.useState("30");
  const [data, setData] = React.useState<MetricsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!firebaseUser) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch(`/api/metrics?days=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao carregar métricas");
        if (!cancelled) setData(json);
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error("Não foi possível carregar as métricas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser, period]);

  if (loadingAuth) {
    return (
      <Layout fullWidth>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!firebaseUser) {
    return (
      <Layout fullWidth>
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-4">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold tracking-tight">
            Você precisa estar logado para ver as métricas.
          </p>
        </div>
      </Layout>
    );
  }

  const showSkeleton = loading || !data;

  return (
    <Layout fullWidth>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Métricas</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Métricas</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Leads e conversas do WhatsApp — pra ajustar horário de atendimento, criativos de
            anúncio e a estratégia do funil.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border bg-background/60 backdrop-blur-sm px-3 py-1.5 shadow-sm self-start sm:self-auto">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="border-0 h-auto p-0 text-xs font-medium bg-transparent shadow-none w-auto gap-1 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="space-y-8 pb-8">
        {/* ── KPIs ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTile
            icon={Users}
            accent="indigo"
            title="Leads no período"
            value={showSkeleton ? null : data!.leads.total}
            hint="Novos cadastros no funil"
          />
          <KpiTile
            icon={Target}
            accent="emerald"
            title="Taxa de conversão"
            value={showSkeleton ? null : pct(data!.leads.taxaConversao)}
            hint="Leads que chegaram a Concluído"
          />
          <KpiTile
            icon={Clock}
            accent="amber"
            title="1º contato"
            value={
              showSkeleton
                ? null
                : data!.leads.tempoMedioPrimeiroContatoHoras == null
                  ? "—"
                  : data!.leads.tempoMedioPrimeiroContatoHoras < 1
                    ? "< 1h"
                    : `${data!.leads.tempoMedioPrimeiroContatoHoras.toFixed(1)}h`
            }
            hint="Tempo médio até marcar como chamado"
          />
          <KpiTile
            icon={MessageCircle}
            accent="blue"
            title="Conversas iniciadas"
            value={showSkeleton ? null : data!.conversas.total}
            hint="Primeiro contato pelo WhatsApp"
          />
        </div>

        {/* ── Quando os leads chamam ──────────────────────── */}
        <section className="space-y-3">
          <SectionTitle
            icon={Clock}
            accent="amber"
            title="Quando os leads chamam"
            subtitle="Pra dimensionar o time de atendimento e programar o horário dos anúncios."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-muted-foreground/10 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Por horário do dia</CardTitle>
              </CardHeader>
              <CardContent>
                {showSkeleton ? (
                  <Skeleton className="h-64 w-full" />
                ) : allZero(data!.conversas.porHora.map((h) => h.count)) ? (
                  <EmptyState text="Sem conversas iniciadas no período." />
                ) : (
                  <ChartContainer config={{ count: { label: "Conversas", color: "var(--chart-1)" } }} className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data!.conversas.porHora} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="hora"
                          tickFormatter={(h: number) => `${h}h`}
                          interval={1}
                          tickLine={false}
                          axisLine={false}
                          fontSize={10}
                          stroke="var(--muted-foreground)"
                        />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={28} />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(_: unknown, payload: { payload?: { hora?: number } }[]) =>
                                `${payload?.[0]?.payload?.hora ?? ""}h`
                              }
                            />
                          }
                        />
                        <Bar dataKey="count" name="Conversas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-muted-foreground/10 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Por dia da semana</CardTitle>
              </CardHeader>
              <CardContent>
                {showSkeleton ? (
                  <Skeleton className="h-64 w-full" />
                ) : allZero(data!.conversas.porDiaSemana.map((d) => d.count)) ? (
                  <EmptyState text="Sem conversas iniciadas no período." />
                ) : (
                  <ChartContainer config={{ count: { label: "Conversas", color: "var(--chart-2)" } }} className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data!.conversas.porDiaSemana} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={28} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" name="Conversas" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Funil de leads ───────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle icon={Target} accent="emerald" title="Funil de leads" subtitle="Onde os leads do período estão parados agora." />
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardContent className="pt-5">
              {showSkeleton ? (
                <Skeleton className="h-64 w-full" />
              ) : data!.leads.porStatus.length === 0 ? (
                <EmptyState text="Sem leads no período." />
              ) : (
                <ChartContainer config={{ count: { label: "Leads" } }} className="w-full" style={{ height: Math.max(180, data!.leads.porStatus.length * 42) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data!.leads.porStatus}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                      <YAxis
                        type="category"
                        dataKey="status"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        width={110}
                        stroke="var(--muted-foreground)"
                      />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]}>
                        {data!.leads.porStatus.map((s) => (
                          <Cell key={s.status} fill={s.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Evolução no tempo ────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle icon={Activity} accent="blue" title="Evolução no período" subtitle="Volume por dia — pra ver se uma mudança recente (criativo, horário, oferta) moveu o ponteiro." />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DailyAreaChart
              title="Leads por dia"
              data={showSkeleton ? [] : data!.leads.serieDiaria}
              loading={showSkeleton}
              gradientId="leadsGradient"
              color="var(--chart-1)"
            />
            <DailyAreaChart
              title="Conversas por dia"
              data={showSkeleton ? [] : data!.conversas.serieDiaria}
              loading={showSkeleton}
              gradientId="conversasGradient"
              color="var(--chart-2)"
            />
          </div>
        </section>

        {/* ── Origem e motivo de dispensa ──────────────────── */}
        <section className="space-y-3">
          <SectionTitle
            icon={Megaphone}
            accent="violet"
            title="De onde vêm, por que saem"
            subtitle="Pra saber se vale reforçar anúncio e o que ajustar na abordagem."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-muted-foreground/10 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Origem dos leads</CardTitle>
                {!showSkeleton && data!.leads.total > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {pct(data!.conversas.total ? data!.conversas.comAnuncio / data!.conversas.total : 0)} das conversas vêm de anúncio
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {showSkeleton ? (
                  <Skeleton className="h-56 w-full" />
                ) : data!.leads.porOrigem.length === 0 ? (
                  <EmptyState text="Sem leads no período." />
                ) : (
                  <HorizontalBarChart data={data!.leads.porOrigem} color="var(--chart-3)" height={56 + data!.leads.porOrigem.length * 34} />
                )}
              </CardContent>
            </Card>

            <Card className="border-muted-foreground/10 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">Motivo de dispensa</CardTitle>
                  <UiTooltip>
                    <UiTooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                    </UiTooltipTrigger>
                    <UiTooltipContent side="top" className="max-w-[240px]">
                      <p className="text-xs">Texto livre digitado ao dispensar — os 8 mais frequentes no período.</p>
                    </UiTooltipContent>
                  </UiTooltip>
                </div>
              </CardHeader>
              <CardContent>
                {showSkeleton ? (
                  <Skeleton className="h-56 w-full" />
                ) : data!.leads.porDispensaMotivo.length === 0 ? (
                  <EmptyState text="Nenhum lead dispensado no período." icon={XCircle} />
                ) : (
                  <HorizontalBarChart
                    data={data!.leads.porDispensaMotivo}
                    color="var(--destructive)"
                    height={56 + data!.leads.porDispensaMotivo.length * 34}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Atendimento: mensagens por dia ───────────────── */}
        <section className="space-y-3">
          <SectionTitle icon={MessageCircle} accent="blue" title="Volume de mensagens" subtitle="Quanto o contato fala com a gente x quanto a gente responde, dia a dia." />
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardContent className="pt-5">
              {showSkeleton ? (
                <Skeleton className="h-64 w-full" />
              ) : data!.conversas.mensagensPorDia.length === 0 ? (
                <EmptyState text="Sem mensagens no período." />
              ) : (
                <ChartContainer
                  config={{
                    inbound: { label: "Do contato", color: "var(--chart-2)" },
                    outbound: { label: "Da equipe", color: "var(--chart-1)" },
                  }}
                  className="h-64 w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data!.conversas.mensagensPorDia} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)" />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={28} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(v: unknown) => shortDate(String(v))} />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="inbound" name="Do contato" stackId="msgs" fill="var(--chart-2)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="outbound" name="Da equipe" stackId="msgs" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Quiz de qualificação ─────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle
            icon={ClipboardList}
            accent="indigo"
            title="Qualificação automática (quiz)"
            subtitle="Quanto o quiz do primeiro contato consegue concluir sozinho, e pra que tipo de necessidade os leads vêm."
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-muted-foreground/10 shadow-sm lg:col-span-1">
              <CardContent className="pt-5 space-y-4">
                {showSkeleton ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  <>
                    <MiniStat label="Iniciados" value={data!.conversas.quiz.iniciados} />
                    <MiniStat label="Concluídos" value={data!.conversas.quiz.concluidos} />
                    <MiniStat label="Interrompidos (atendente entrou)" value={data!.conversas.quiz.interrompidos} />
                    <MiniStat label="Taxa de conclusão" value={pct(data!.conversas.quiz.taxaConclusao)} accent />
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-muted-foreground/10 shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Necessidade principal</CardTitle>
              </CardHeader>
              <CardContent>
                {showSkeleton ? (
                  <Skeleton className="h-40 w-full" />
                ) : data!.conversas.quiz.porNecessidade.length === 0 ? (
                  <EmptyState text="Sem quiz concluído com esse dado no período." />
                ) : (
                  <HorizontalBarChart
                    data={data!.conversas.quiz.porNecessidade}
                    color="var(--chart-4)"
                    height={40 + data!.conversas.quiz.porNecessidade.length * 40}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Estados ───────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionTitle icon={MapPin} accent="blue" title="De onde vêm os leads" subtitle="Top 10 estados por volume de leads — pra mirar a segmentação geográfica dos anúncios." />
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardContent className="pt-5">
              {showSkeleton ? (
                <Skeleton className="h-72 w-full" />
              ) : data!.leads.porEstado.length === 0 ? (
                <EmptyState text="Sem estado informado nos leads do período." icon={MapPin} />
              ) : (
                <ChartContainer config={{ count: { label: "Leads", color: "var(--chart-1)" } }} className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data!.leads.porEstado} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="key" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={28} />
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="count" name="Leads" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}

// ========================
// SUBCOMPONENTES
// ========================

const ACCENTS = {
  indigo: { bg: "bg-indigo-500/10", ring: "ring-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400" },
  emerald: { bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-500/10", ring: "ring-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
  blue: { bg: "bg-blue-500/10", ring: "ring-blue-500/20", text: "text-blue-600 dark:text-blue-400" },
  violet: { bg: "bg-violet-500/10", ring: "ring-violet-500/20", text: "text-violet-600 dark:text-violet-400" },
} as const;

type Accent = keyof typeof ACCENTS;

function KpiTile({
  icon: Icon,
  accent,
  title,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  title: string;
  value: React.ReactNode;
  hint: string;
}) {
  const a = ACCENTS[accent];
  return (
    <Card className="border-muted-foreground/10 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            {value == null ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
            )}
            <p className="text-xs text-muted-foreground/80">{hint}</p>
          </div>
          <div className={cn("h-10 w-10 rounded-xl ring-1 flex items-center justify-center shrink-0", a.bg, a.ring)}>
            <Icon className={cn("h-5 w-5", a.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  accent,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  title: string;
  subtitle: string;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-xl ring-1 flex items-center justify-center shrink-0", a.bg, a.ring)}>
        <Icon className={cn("h-4.5 w-4.5", a.text)} />
      </div>
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", accent && "text-emerald-600 dark:text-emerald-400")}>{value}</p>
    </div>
  );
}

function EmptyState({ text, icon: Icon = Info }: { text: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function allZero(values: number[]) {
  return values.every((v) => v === 0);
}

/** Barra horizontal genérica pra breakdown categórico ({ key, count }[]). */
function HorizontalBarChart({ data, color, height }: { data: Bucket[]; color: string; height: number }) {
  return (
    <ChartContainer config={{ count: { label: "Total", color } }} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
          <YAxis
            type="category"
            dataKey="key"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={130}
            stroke="var(--muted-foreground)"
            tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)}
          />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="count" name="Total" fill={color} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

/** Área com gradiente pra série diária de 1 valor só (leads/dia, conversas/dia). */
function DailyAreaChart({
  title,
  data,
  loading,
  gradientId,
  color,
}: {
  title: string;
  data: DiaBucket[];
  loading: boolean;
  gradientId: string;
  color: string;
}) {
  return (
    <Card className="border-muted-foreground/10 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : data.length === 0 || allZero(data.map((d) => d.count)) ? (
          <EmptyState text="Sem dados no período." />
        ) : (
          <ChartContainer config={{ count: { label: title, color } }} className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={28} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(v: unknown) => shortDate(String(v))} />} />
                <Area type="monotone" dataKey="count" name={title} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
