"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, History, Loader2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl, dataHora, resumoEntrada, type CotacaoSalvaDto } from "./comum";

/**
 * Cotações salvas. Os valores mostrados vêm da CÓPIA gravada na hora de salvar, não da tabela
 * atual — se a operadora reajustar, o histórico continua com o preço da época.
 */
export function HistoricoCotacoes({
  cotacoes,
  carregando,
  leadFiltrado,
}: {
  cotacoes: CotacaoSalvaDto[];
  carregando: boolean;
  leadFiltrado: string | null;
}) {
  const [abertas, setAbertas] = React.useState<Set<string>>(new Set());

  function alternar(id: string) {
    setAbertas((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" />
          {leadFiltrado ? `Cotações de ${leadFiltrado}` : "Cotações salvas"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : cotacoes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma cotação salva ainda.
          </p>
        ) : (
          <ul className="divide-y">
            {cotacoes.map((c) => {
              const aberta = abertas.has(c.id);
              const opcoes = c.resultado?.opcoes ?? [];
              return (
                <li key={c.id} className="py-3">
                  <button
                    type="button"
                    onClick={() => alternar(c.id)}
                    className="flex w-full items-start gap-2 text-left"
                  >
                    <span className="mt-0.5 text-muted-foreground">
                      {aberta ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {dataHora(c.criado_em)}
                        <Badge variant="secondary">
                          {c.resultado?.vidas ?? c.entrada.idades.length} vida
                          {(c.resultado?.vidas ?? c.entrada.idades.length) !== 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="outline">
                          {opcoes.length} opç{opcoes.length === 1 ? "ão" : "ões"}
                        </Badge>
                        {c.lead_nome && !leadFiltrado && (
                          <span className="text-xs font-normal text-muted-foreground">
                            lead: {c.lead_nome}
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {resumoEntrada(c.entrada) || "Sem filtros"}
                        {c.criado_por && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <User className="size-3" />
                            {c.criado_por}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>

                  {aberta && (
                    <div className="mt-3 space-y-2 pl-6">
                      <p className="text-xs text-muted-foreground">
                        Idades: {c.entrada.idades.join(", ")} · valores da época da cotação
                        {c.resultado?.tabelas_atualizadas_em
                          ? ` (tabelas de ${dataHora(c.resultado.tabelas_atualizadas_em)})`
                          : ""}
                      </p>
                      {opcoes.map((o) => (
                        <div
                          key={`${o.referencia.px_vinculo_id}:${o.referencia.px_plano_id}`}
                          className="rounded-md border p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-medium">
                              {o.produto ?? "—"} · {o.plano}
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                · {[o.linha, o.acomodacao, o.coparticipacao, o.contratacao]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                            <span className="font-semibold tabular-nums">{brl(o.total)}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                            {o.detalhamento.map((d, i) => (
                              <span key={i}>
                                {d.idade} anos ({d.faixa}): {brl(d.valor)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
