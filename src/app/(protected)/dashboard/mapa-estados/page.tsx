// app/dashboard/mapa-vendas/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { MapPin, Trophy } from "lucide-react"; // ⬅️ adicionamos Trophy

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Lead = {
  id: string;
  origem: string;
  status: string;
  valor_comissao: number | null;
  data_entrada: string;
  estado: string; // deve ser a sigla: SP, RJ, BA...
  // campos extras usados no filtro de tempo (podem vir do backend)
  updated_at?: string;
  data_venda: string | null;
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

export default function MapaVendasPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    uf: string;
    vendas: number;
    x: number;
    y: number;
  }>({
    visible: false,
    uf: "",
    vendas: 0,
    x: 0,
    y: 0,
  });

  // mesmo filtro do Funil
  const [filtroFinalizados, setFiltroFinalizados] =
    useState<string>("este-mes");

  // ----------------- buscar leads -----------------
  const fetchLeads = async () => {
    if (!firebaseUser) return;

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(`/api/dashboard/leads?${params.toString()}`);

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

  useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, loadingAuth]);

  // ----------------- agregação por estado + filtro de tempo -----------------
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
      .filter((l) => l.status === "Concluído")
      .filter((lead) => {
        if (!cutoffIso) return true;

        // 🔥 filtra somente por data_venda
        if (!lead.data_venda) return false;

        return new Date(lead.data_venda) >= new Date(cutoffIso);
      })
      .forEach((lead) => {
        const uf = lead.estado || "N/D";
        mapa[uf] = (mapa[uf] || 0) + 1;
      });

    return mapa;
  }, [leads, filtroFinalizados]);

  // ----------------- estado campeão + totais -----------------
  const { estadoTop, maxVendas, totalEstados, totalVendas } = useMemo(() => {
    let max = 0;
    let ufTop: string | null = null;
    let total = 0;
    let estadosComVenda = 0;

    Object.entries(vendasPorEstado).forEach(([uf, qtd]) => {
      total += qtd;
      if (qtd > 0) estadosComVenda += 1;
      if (qtd > max) {
        max = qtd;
        ufTop = uf;
      }
    });

    return {
      estadoTop: ufTop,
      maxVendas: max,
      totalEstados: estadosComVenda,
      totalVendas: total,
    };
  }, [vendasPorEstado]);

  // ----------------- estados de loading / auth -----------------
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
            Você precisa estar logado para ver o mapa de vendas.
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

  // ----------------- UI -----------------
  return (
    <Layout>
      <div className="space-y-6">
        {/* Cabeçalho + filtro (igual ao Funil) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MapPin className="w-7 h-7 text-primary" />
              Mapa de Vendas por Estado
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize em qual estado você mais conclui vendas, de acordo com o
              período selecionado.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">
              Exibir Finalizados:
            </Label>
            <Select
              value={filtroFinalizados}
              onValueChange={setFiltroFinalizados}
            >
              <SelectTrigger className="w-[180px]">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
          {/* Mapa */}
          <Card className="overflow-hidden bg-gray-100">
            <CardHeader>
              <CardTitle>Distribuição de vendas concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[420px]">
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{
                    scale: 700,
                    center: [-55, -15],
                  }}
                  width={800}
                  height={500}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <Geographies geography={geographyUrl}>
                    {({ geographies }: { geographies: any[] }) =>
                      geographies.map((geo) => {
                        const props = geo.properties || {};

                        let uf: string =
                          props.sigla ||
                          props.UF ||
                          props.uf ||
                          props.SIGLA ||
                          props.code ||
                          "";

                        if (
                          !uf &&
                          props.name &&
                          typeof props.name === "string"
                        ) {
                          uf = NOME_PARA_SIGLA[props.name] || "";
                        }

                        const vendas = vendasPorEstado[uf] || 0;
                        const isTop = estadoTop === uf && maxVendas > 0;
                        const temVendas = vendas > 0;

                        const baseFill = isTop
                          ? "#16a34a"
                          : temVendas
                          ? "#bbf7d0"
                          : "#ffffff";

                        const hoverFill = isTop
                          ? "#15803d"
                          : temVendas
                          ? "#22c55e"
                          : "#cbd5e1";

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
                                transition:
                                  "transform 150ms ease, fill 150ms ease, box-shadow 150ms ease",
                                cursor: temVendas ? "pointer" : "default",
                              },
                              hover: {
                                fill: hoverFill,
                                stroke: "#4b5563",
                                strokeWidth: 1,
                                outline: "none",
                                boxShadow: "0 10px 15px rgba(0,0,0,0.12)",
                                cursor: "pointer",
                              },
                              pressed: {
                                fill: hoverFill,
                                outline: "none",
                              },
                            }}
                            onMouseEnter={(e: any) => {
                              setTooltip({
                                visible: true,
                                uf,
                                vendas,
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }}
                            onMouseMove={(e: any) => {
                              setTooltip((prev) => ({
                                ...prev,
                                x: e.clientX,
                                y: e.clientY,
                              }));
                            }}
                            onMouseLeave={() => {
                              setTooltip((prev) => ({
                                ...prev,
                                visible: false,
                              }));
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
                {tooltip.visible && (
                  <div
                    className="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
                    style={{
                      top: tooltip.y + 12,
                      left: tooltip.x + 12,
                    }}
                  >
                    <div className="font-semibold">
                      {tooltip.uf || "Sem UF"}
                    </div>
                    <div className="text-muted-foreground">
                      {tooltip.vendas} venda
                      {tooltip.vendas === 1 ? "" : "s"} concluída
                      {tooltip.vendas === 1 ? "" : "s"}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Painel lateral com resumo */}
          <Card>
            <CardHeader className="pb-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  Resumo por estado
                </CardTitle>

                {totalVendas > 0 && (
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {totalVendas} venda
                    {totalVendas === 1 ? "" : "s"} no período
                  </span>
                )}
              </div>

              {totalEstados > 0 && (
                <p className="text-xs text-muted-foreground">
                  {totalEstados} estado
                  {totalEstados === 1 ? "" : "s"} com vendas registradas.
                </p>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {estadoTop ? (
                <div className="flex items-start gap-3 rounded-xl border bg-linear-to-br from-emerald-50 via-background to-slate-50 p-4 dark:from-emerald-900/20 dark:via-background dark:to-slate-900/40">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <Trophy className="h-5 w-5" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Estado campeão no período
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex justify-center items-center gap-2 text-2xl font-semibold tracking-tight">
                        <img
                          src={getFlagUrl(estadoTop)}
                          alt={`Bandeira de ${estadoTop}`}
                          className="inline-block h-9 w-12 rounded-sm border object-cover"
                        />
                        {Object.entries(NOME_PARA_SIGLA).find(
                          ([_, sigla]) => sigla === estadoTop
                        )?.[0] || estadoTop}
                        <p></p>
                      </span>

                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {maxVendas} venda
                        {maxVendas === 1 ? "" : "s"}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Destaque entre {totalEstados} estado
                      {totalEstados === 1 ? "" : "s"} com vendas neste período.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda não há vendas concluídas para exibir no mapa neste
                  período.
                </p>
              )}

              <div className="max-h-[260px] overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/40">
                    <tr className="border-b">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Estado
                      </th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Vendas concl.
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
                            className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                          >
                            <td className="py-2 px-3 font-medium">
                              <div className="flex items-center gap-2">
                                {/* Bandeira */}
                                <img
                                  src={getFlagUrl(uf)}
                                  alt={`Bandeira de ${uf}`}
                                  className="h-4 w-6 rounded-sm border object-cover"
                                />

                                {/* Troféu , se for o top */}
                                {isTop && (
                                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                )}

                                {/* Sigla */}
                                <span>{uf}</span>
                              </div>
                            </td>

                            <td className="py-2 px-3 text-right font-semibold text-success">
                              {qtd}
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
    </Layout>
  );
}
