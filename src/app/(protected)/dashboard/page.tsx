// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  ThumbsUp,
  CheckCircle2,
  MapPin,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// 🔁 Reaproveitando o mesmo tipo de Lead do Funil
import LeadCard, { Lead as FunilLead } from "@/components/LeadCard";

type Lead = FunilLead;

type LoteProducaoResumo = {
  volume_total_chamado: number | null;
  qtd_leads_novos: number | null;
  qtd_retrabalhos: number | null;
  qtd_ligacao: number | null;
  qtd_indicacao: number | null;
  qtd_presencial: number | null;
};

const DashboardPage = () => {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [volumeProducao, setVolumeProducao] = useState<number>(0);
  const [filtroOrigem, setFiltroOrigem] = useState<string>("Todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("este-mes");
  const [loading, setLoading] = useState(true);

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

  // mesma lógica conceitual do "badge" do funil:
  // - leads ativos
  // - nunca chamados OU chamados há mais de 24h
  const leadPrecisaRetorno = (lead: Lead) => {
    if (!isLeadAtivo(lead.status)) return false;

    if (!lead.last_chamado_at) {
      // nunca foi chamado -> precisa retorno
      return true;
    }

    const last = new Date(lead.last_chamado_at);
    if (Number.isNaN(last.getTime())) return false;

    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours > 24;
  };

  // ----------------- fetch Leads -----------------
const fetchLeads = async () => {
  if (!firebaseUser) return;

  try {
    const params = new URLSearchParams({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "",
    });

    // 👇 troque essa linha:
    // const res = await fetch(`/api/dashboard/leads?${params.toString()}`);
    // 👇 por esta:
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

  // ----------------- cálculos de métricas -----------------
  const filteredLeads = leads.filter((lead) => {
    const { startDate, endDate } = getDateRange();

    // datas base do range em formato YYYY-MM-DD
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    // data do lead em formato YYYY-MM-DD
    const leadDateStr = lead.data_entrada.slice(0, 10); // "2025-11-27..."

    const dentroDataRange = leadDateStr >= startStr && leadDateStr <= endStr;

    const origemMatch =
      filtroOrigem === "Todos" || lead.origem === filtroOrigem;

    return dentroDataRange && origemMatch;
  });

  const totalLeads = filteredLeads.length;
  const vendasFechadas = filteredLeads.filter(
    (l) => l.status === "Concluído"
  ).length;

  const totalComissoes = filteredLeads
    .filter((l) => l.status === "Concluído")
    .reduce((acc, l) => acc + (l.valor_comissao || 0), 0);

  // leads que em algum momento “se movimentaram” (responderam)
  const leadsConcluidos = filteredLeads.filter((l) =>
    ["Avaliando", "Dispensado", "Concluído"].includes(l.status)
  ).length;

  // leads considerados qualificados
  const leadsQualificados = filteredLeads.filter((l) =>
    ["Avaliando", "Fechamento", "Concluído"].includes(l.status)
  ).length;

  const taxaResposta =
    volumeProducao > 0 ? (totalLeads / volumeProducao) * 100 : 0;

  const taxaQualificacao =
    totalLeads > 0 ? (leadsQualificados / totalLeads) * 100 : 0;

  const taxaFechamento =
    leadsQualificados > 0 ? (vendasFechadas / volumeProducao) * 100 : 0;

  // ----------------- leads que precisam de retorno -----------------
  const leadsParaRetorno = filteredLeads
    .filter(leadPrecisaRetorno)
    .sort((a, b) => {
      // ordem: nunca chamados primeiro, depois mais antigos
      const aHasLast = !!a.last_chamado_at;
      const bHasLast = !!b.last_chamado_at;

      if (!aHasLast && !bHasLast) return 0;
      if (!aHasLast && bHasLast) return -1;
      if (aHasLast && !bHasLast) return 1;

      const aTime = new Date(a.last_chamado_at as string).getTime();
      const bTime = new Date(b.last_chamado_at as string).getTime();
      return aTime - bTime; // mais antigo primeiro
    });

  const qtdLeadsParaRetorno = leadsParaRetorno.length;

  const metrics = [
    {
      title: "Volume Total de Produção",
      value: volumeProducao,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      colNumber: 1,
    },
    {
      title: "Total de Leads Abordados",
      value: totalLeads,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      colNumber: 1,
    },
    {
      title: "Vendas Fechadas",
      value: vendasFechadas,
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/10",
      colNumber: 1,
    },
    {
      title: "Taxa de Resposta",
      value: `${taxaResposta.toFixed(1)}%`,
      icon: ThumbsUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      colNumber: 1,
    },
    {
      title: "Taxa de Qualificação",
      value: `${taxaQualificacao.toFixed(1)}%`,
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      colNumber: 1,
    },
    {
      title: "Taxa de Fechamento",
      value: `${taxaFechamento.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      colNumber: 1,
    },
    {
      title: "Total em Comissões",
      value: (totalComissoes ?? 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
      colNumber: 3,
    },
  ];

  // ----------------- estados de loading / sem login -----------------
  if (loadingAuth) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Performance</h1>
          <p className="text-muted-foreground mt-1">
            Análise completa das suas métricas de vendas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filtrar por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Lead Novo">Apenas Leads Novos</SelectItem>
                  <SelectItem value="Retrabalho">Apenas Retrabalhos</SelectItem>
                  <SelectItem value="Ligação">Apenas Ligações</SelectItem>
                  <SelectItem value="Indicação">Apenas Indicações</SelectItem>
                  <SelectItem value="Presencial">Apenas Presenciais</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Período</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="este-mes">Este Mês</SelectItem>
                  <SelectItem value="mes-passado">Mês Passado</SelectItem>
                  <SelectItem value="ultimos-90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card
                key={index}
                className={`shadow-sm hover:shadow-md transition-shadow ${`col-span-${metric.colNumber}`}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {metric.title}
                      </p>
                      <p className={`text-3xl font-bold ${metric.color}`}>
                        {metric.value}
                      </p>
                    </div>
                    <div className={`${metric.bgColor} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${metric.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* EXPLICAÇÃO DAS MÉTRICAS */}
        <Card className="bg-linerar-to-br from-primary/5 to-success/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  Entenda suas métricas
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    <strong>Taxa de Resposta:</strong> % de leads que geraram
                    algum retorno (Avaliando, Dispensado ou Concluído) em
                    relação ao total de leads no período.
                  </li>
                  <li>
                    <strong>Taxa de Qualificação:</strong> % de leads que
                    avançaram para oportunidade/negociação (Avaliando,
                    Fechamento ou Concluído) em relação ao total de leads.
                  </li>
                  <li>
                    <strong>Taxa de Fechamento:</strong> % de vendas concluídas
                    em relação aos leads abordados (Avaliando, Fechamento ou
                    Concluído).
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LEADS QUE PRECISAM DE RETORNO (USANDO LeadCard) */}
        <Card className="bg-linerar-to-br from-primary/5 to-success/5 border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="font-semibold text-lg">
                    Leads que você precisa retornar
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {qtdLeadsParaRetorno > 0
                      ? `${qtdLeadsParaRetorno} lead${
                          qtdLeadsParaRetorno > 1 ? "s" : ""
                        } aguardando contato há mais de 24h`
                      : "Nenhum lead pendente de retorno há mais de 24h 🎉"}
                  </p>
                </div>
              </div>
            </div>

            {qtdLeadsParaRetorno > 0 && (
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
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 10 estados por volume de vendas */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Top 10 Estados por Volume de Vendas</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Estados com mais vendas fechadas no período
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={(() => {
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
                  })()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

                  <XAxis
                    dataKey="estado"
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                    axisLine={{ stroke: "#D1D5DB" }}
                    tickLine={{ stroke: "#D1D5DB" }}
                  />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                    axisLine={{ stroke: "#D1D5DB" }}
                    tickLine={{ stroke: "#D1D5DB" }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      color: "#111827",
                    }}
                  />

                  <defs>
                    <linearGradient
                      id="vendasGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.9} />
                      <stop
                        offset="100%"
                        stopColor="#22C55E"
                        stopOpacity={0.4}
                      />
                    </linearGradient>
                  </defs>

                  <Bar
                    dataKey="vendas"
                    radius={[8, 8, 0, 0]}
                    fill="url(#vendasGradient)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Taxa de fechamento por estado */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <CardTitle>Taxa de Fechamento por Estado</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Eficiência de conversão em cada estado
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="border-b sticky top-0 bg-background">
                    <tr>
                      <th className="text-left py-3 px-2 font-semibold">
                        Estado
                      </th>
                      <th className="text-center py-3 px-2 font-semibold">
                        Leads Qualificados
                      </th>
                      <th className="text-center py-3 px-2 font-semibold">
                        Vendas Concluídas
                      </th>
                      <th className="text-center py-3 px-2 font-semibold">
                        Taxa de Fechamento
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const estadosData = filteredLeads.reduce((acc, lead) => {
                        const key = lead.estado || "N/D";
                        if (!acc[key]) {
                          acc[key] = { qualificados: 0, vendas: 0 };
                        }

                        const ehQualificado = [
                          "Avaliando",
                          "Fechamento",
                          "Concluído",
                        ].includes(lead.status);

                        if (ehQualificado) {
                          acc[key].qualificados++;
                        }

                        if (lead.status === "Concluído") {
                          acc[key].vendas++;
                        }

                        return acc;
                      }, {} as Record<string, { qualificados: number; vendas: number }>);

                      return Object.entries(estadosData)
                        .map(([estado, data]) => {
                          const taxa =
                            data.qualificados > 0
                              ? (data.vendas / data.qualificados) * 100
                              : 0;

                          return {
                            estado,
                            qualificados: data.qualificados,
                            vendas: data.vendas,
                            taxa,
                          };
                        })
                        .sort((a, b) => b.taxa - a.taxa)
                        .map((row, index) => (
                          <tr
                            key={row.estado}
                            className={index % 2 === 0 ? "bg-muted/20" : ""}
                          >
                            <td className="py-3 px-2 font-medium">
                              {row.estado}
                            </td>
                            <td className="py-3 px-2 text-center">
                              {row.qualificados}
                            </td>
                            <td className="py-3 px-2 text-center text-success font-semibold">
                              {row.vendas}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span
                                className={`inline-flex items-center justify-center min-w-[60px] px-2 py-1 rounded-full text-xs font-semibold ${
                                  row.taxa >= 20
                                    ? "bg-success/10 text-success"
                                    : row.taxa >= 10
                                    ? "bg-accent/10 text-accent"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {row.taxa.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ));
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;