// app/dashboard/mapa-vendas/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { MapPin } from "lucide-react";

type Lead = {
  id: string;
  origem: string;
  status: string;
  valor_comissao: number | null;
  data_entrada: string;
  estado: string; // deve ser a sigla: SP, RJ, BA...
};

const geographyUrl =
  "https://raw.githubusercontent.com/giuliano-macedo/geodata-br-states/main/geojson/br_states.json";

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

  // ----------------- agregação por estado -----------------
  const vendasPorEstado = useMemo(() => {
    const mapa: Record<string, number> = {};

    leads
      .filter((l) => l.status === "Concluído")
      .forEach((lead) => {
        const uf = lead.estado || "N/D";
        mapa[uf] = (mapa[uf] || 0) + 1;
      });

    return mapa;
  }, [leads]);

  const { estadoTop, maxVendas } = useMemo(() => {
    let max = 0;
    let ufTop: string | null = null;

    Object.entries(vendasPorEstado).forEach(([uf, qtd]) => {
      if (qtd > max) {
        max = qtd;
        ufTop = uf;
      }
    });

    return { estadoTop: ufTop, maxVendas: max };
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
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="w-7 h-7 text-primary" />
            Mapa de Vendas por Estado
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize em qual estado você mais conclui vendas.
          </p>
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
            <CardHeader>
              <CardTitle>Resumo por estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {estadoTop ? (
                <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
                  <p className="text-xs tracking-wide uppercase text-muted-foreground">
                    Estado com mais vendas
                  </p>
                  <p className="text-2xl font-bold">
                    {estadoTop}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({maxVendas} vendas concluídas)
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda não há vendas concluídas para exibir no mapa.
                </p>
              )}

              <div className="max-h-[260px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left py-2 px-2 font-semibold">
                        Estado
                      </th>
                      <th className="text-right py-2 px-2 font-semibold">
                        Vendas concl.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(vendasPorEstado)
                      .sort((a, b) => b[1] - a[1])
                      .map(([uf, qtd]) => (
                        <tr key={uf} className="border-b last:border-0">
                          <td className="py-2 px-2 font-medium">{uf}</td>
                          <td className="py-2 px-2 text-right text-success font-semibold">
                            {qtd}
                          </td>
                        </tr>
                      ))}
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
