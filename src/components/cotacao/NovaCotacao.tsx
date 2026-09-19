"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { EntradaCotacao, Modalidade } from "@/lib/px/cotacao";
import {
  brl,
  chaveOpcao,
  dataHora,
  extrairIdades,
  type AuthHeader,
  type CalculoDto,
  type LeadResumo,
} from "./comum";

const TODOS = "__todos__";

const CONTRATACAO = ["Compulsório", "Opcional/Livre Adesão"];
const COPARTICIPACAO = ["Parcial", "Completa"];
const ACOMODACAO = ["Enfermaria", "Apartamento"];
const LINHA = ["Amil", "Selecionada", "Black"];

function FiltroSelect({
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{rotulo}</Label>
      <Select value={valor || TODOS} onValueChange={(v) => onChange(v === TODOS ? "" : v)}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          <SelectItem value={TODOS}>Todas</SelectItem>
          {opcoes.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function NovaCotacao({
  authHeader,
  leads,
  leadInicial,
  onSalva,
}: {
  authHeader: AuthHeader;
  leads: LeadResumo[];
  leadInicial: string | null;
  onSalva: () => void;
}) {
  // ----- entrada -----
  const [idades, setIdades] = React.useState<number[]>([]);
  const [idadeTexto, setIdadeTexto] = React.useState("");
  const [modalidade, setModalidade] = React.useState<Modalidade>("PME");
  const [mei, setMei] = React.useState(false);
  const [contratacao, setContratacao] = React.useState("");
  const [coparticipacao, setCoparticipacao] = React.useState("");
  const [acomodacao, setAcomodacao] = React.useState("");
  const [linha, setLinha] = React.useState("");
  const [obstetricia, setObstetricia] = React.useState<"" | "com" | "sem">("");
  const [entidade, setEntidade] = React.useState("");

  // ----- lead (opcional) -----
  const [leadId, setLeadId] = React.useState<string | null>(leadInicial);
  const [buscaLead, setBuscaLead] = React.useState("");

  // ----- resultado -----
  const [calculo, setCalculo] = React.useState<CalculoDto | null>(null);
  const [entradaCalculada, setEntradaCalculada] = React.useState<EntradaCotacao | null>(null);
  const [calculando, setCalculando] = React.useState(false);
  const [selecionadas, setSelecionadas] = React.useState<Set<string>>(new Set());
  const [expandidas, setExpandidas] = React.useState<Set<string>>(new Set());
  const [salvando, setSalvando] = React.useState(false);

  // ----- filtros rápidos da lista -----
  const [busca, setBusca] = React.useState("");
  const [rapidoAcomodacao, setRapidoAcomodacao] = React.useState("");
  const [rapidoCoparticipacao, setRapidoCoparticipacao] = React.useState("");
  const [rapidoLinha, setRapidoLinha] = React.useState("");

  const leadSelecionado = leads.find((l) => l.id === leadId) ?? null;

  // ---------------------------------------------------------------- idades
  function adicionarIdades() {
    const { validas, invalidas } = extrairIdades(idadeTexto);
    if (invalidas.length > 0) {
      toast.error(`Idade inválida: ${invalidas.join(", ")} (use números de 0 a 120)`);
    }
    if (validas.length > 0) {
      setIdades((prev) => [...prev, ...validas]);
      setIdadeTexto("");
    }
  }

  // ---------------------------------------------------------------- calcular
  async function calcular() {
    if (idades.length === 0) {
      toast.error("Adicione ao menos uma idade");
      return;
    }
    const entrada: EntradaCotacao = {
      idades,
      modalidade,
      ...(modalidade === "PME" ? { mei } : {}),
      ...(contratacao ? { contratacao } : {}),
      ...(coparticipacao ? { coparticipacao } : {}),
      ...(acomodacao ? { acomodacao } : {}),
      ...(linha ? { linha } : {}),
      ...(obstetricia ? { obstetricia: obstetricia === "com" } : {}),
      ...(modalidade === "Adesão" && entidade.trim() ? { entidade: entidade.trim() } : {}),
    };

    setCalculando(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch("/api/px/cotacoes/calcular", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ entrada }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao calcular");
      setCalculo(data as CalculoDto);
      setEntradaCalculada(entrada);
      setSelecionadas(new Set());
      setExpandidas(new Set());
      setBusca("");
      setRapidoAcomodacao("");
      setRapidoCoparticipacao("");
      setRapidoLinha("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao calcular");
    } finally {
      setCalculando(false);
    }
  }

  // ---------------------------------------------------------------- salvar
  async function salvar() {
    if (!calculo || !entradaCalculada || selecionadas.size === 0) return;
    const escolhidas = calculo.resultados
      .filter((r) => selecionadas.has(chaveOpcao(r)))
      .map((r) => r.referencia);

    setSalvando(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch("/api/px/cotacoes", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          entrada: entradaCalculada,
          selecionadas: escolhidas.map((e) => ({
            px_vinculo_id: e.px_vinculo_id,
            px_plano_id: e.px_plano_id,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
      toast.success(
        leadSelecionado
          ? `Cotação salva no lead ${leadSelecionado.nome}`
          : "Cotação salva (sem lead)"
      );
      setSelecionadas(new Set());
      onSalva();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  // ---------------------------------------------------------------- lista filtrada
  const visiveis = React.useMemo(() => {
    if (!calculo) return [];
    const q = busca.trim().toLowerCase();
    return calculo.resultados.filter((r) => {
      if (rapidoAcomodacao && r.acomodacao !== rapidoAcomodacao) return false;
      if (rapidoCoparticipacao && !(r.coparticipacao ?? "").startsWith(rapidoCoparticipacao)) return false;
      if (rapidoLinha && r.linha !== rapidoLinha) return false;
      if (!q) return true;
      return [r.produto, r.operadora, r.plano, r.linha, r.coparticipacao, r.contratacao]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [calculo, busca, rapidoAcomodacao, rapidoCoparticipacao, rapidoLinha]);

  const motivosExcluidas = React.useMemo(() => {
    const cont = new Map<string, number>();
    for (const e of calculo?.excluidas ?? []) {
      cont.set(e.motivo, (cont.get(e.motivo) ?? 0) + 1);
    }
    return [...cont.entries()].sort((a, b) => b[1] - a[1]);
  }, [calculo]);

  const leadsFiltrados = React.useMemo(() => {
    const q = buscaLead.trim().toLowerCase();
    if (!q) return [];
    return leads
      .filter((l) => l.nome.toLowerCase().includes(q) || (l.telefone ?? "").includes(q))
      .slice(0, 6);
  }, [leads, buscaLead]);

  function alternar(set: Set<string>, chave: string) {
    const novo = new Set(set);
    if (novo.has(chave)) novo.delete(chave);
    else novo.add(chave);
    return novo;
  }

  // ================================================================ render
  return (
    <div className="space-y-6">
      {/* ── Formulário ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="size-4" />
            Nova cotação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Beneficiários */}
          <div className="space-y-2">
            <Label>Beneficiários (idades)</Label>
            <div className="flex gap-2">
              <Input
                value={idadeTexto}
                onChange={(e) => setIdadeTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarIdades();
                  }
                }}
                onPaste={(e) => {
                  const texto = e.clipboardData.getData("text");
                  if (/[\s,;]/.test(texto.trim())) {
                    e.preventDefault();
                    const { validas, invalidas } = extrairIdades(texto);
                    if (invalidas.length) toast.error(`Idade inválida: ${invalidas.join(", ")}`);
                    if (validas.length) setIdades((prev) => [...prev, ...validas]);
                  }
                }}
                placeholder="Digite uma idade ou cole uma lista: 34, 31, 4"
                inputMode="numeric"
              />
              <Button type="button" variant="outline" onClick={adicionarIdades} className="gap-1.5">
                <Plus className="size-4" />
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {idades.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhuma idade adicionada</span>
              )}
              {idades.map((idade, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {idade} anos
                  <button
                    type="button"
                    aria-label={`Remover idade ${idade}`}
                    onClick={() => setIdades((prev) => prev.filter((_, j) => j !== i))}
                    className="rounded-full p-0.5 hover:bg-foreground/10"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              {idades.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground ml-1">
                    {idades.length} vida{idades.length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => setIdades([])}
                  >
                    Limpar
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Modalidade / MEI / filtros */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Modalidade</Label>
              <Select value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="PME">PME</SelectItem>
                  <SelectItem value="Adesão">Adesão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modalidade === "PME" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Empresa MEI?</Label>
                <div className="flex h-9 items-center gap-2 rounded-md border px-3">
                  <Switch checked={mei} onCheckedChange={setMei} id="cot-mei" />
                  <Label htmlFor="cot-mei" className="text-sm font-normal">
                    {mei ? "Sim, é MEI" : "Não é MEI"}
                  </Label>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Entidade de classe (sigla)</Label>
                <Input
                  className="h-9"
                  value={entidade}
                  onChange={(e) => setEntidade(e.target.value)}
                  placeholder="Ex: UNICOM"
                />
              </div>
            )}

            {modalidade === "PME" && (
              <FiltroSelect
                rotulo="Contratação"
                valor={contratacao}
                onChange={setContratacao}
                opcoes={CONTRATACAO}
              />
            )}
            <FiltroSelect
              rotulo="Coparticipação"
              valor={coparticipacao}
              onChange={setCoparticipacao}
              opcoes={COPARTICIPACAO}
            />
            <FiltroSelect
              rotulo="Acomodação"
              valor={acomodacao}
              onChange={setAcomodacao}
              opcoes={ACOMODACAO}
            />
            {modalidade === "PME" && (
              <FiltroSelect rotulo="Linha" valor={linha} onChange={setLinha} opcoes={LINHA} />
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Obstetrícia</Label>
              <Select
                value={obstetricia || TODOS}
                onValueChange={(v) => setObstetricia(v === TODOS ? "" : (v as "com" | "sem"))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value={TODOS}>Indiferente</SelectItem>
                  <SelectItem value="com">Com obstetrícia</SelectItem>
                  <SelectItem value="sem">Sem obstetrícia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lead (opcional) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Lead (opcional — pra guardar a cotação nele)</Label>
            {leadSelecionado ? (
              <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <span className="truncate font-medium">{leadSelecionado.nome}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="Tirar lead"
                  onClick={() => setLeadId(null)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={buscaLead}
                  onChange={(e) => setBuscaLead(e.target.value)}
                  placeholder="Buscar lead por nome ou telefone"
                />
                {leadsFiltrados.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                    {leadsFiltrados.map((l) => (
                      <li key={l.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setLeadId(l.id);
                            setBuscaLead("");
                          }}
                        >
                          <span className="truncate">{l.nome}</span>
                          <span className="text-xs text-muted-foreground">{l.telefone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <Button onClick={calcular} disabled={calculando || idades.length === 0} className="gap-2">
            {calculando ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
            Calcular cotação
          </Button>
        </CardContent>
      </Card>

      {/* ── Resultado ── */}
      {calculo && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {calculo.resultados.length} opç{calculo.resultados.length === 1 ? "ão" : "ões"} para{" "}
                {calculo.vidas} vida{calculo.vidas !== 1 ? "s" : ""}
              </CardTitle>
              <Button
                onClick={salvar}
                disabled={selecionadas.size === 0 || salvando}
                className="gap-2"
              >
                {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Salvar {selecionadas.size > 0 ? `${selecionadas.size} opç${selecionadas.size === 1 ? "ão" : "ões"}` : "cotação"}
                {leadSelecionado ? " no lead" : ""}
              </Button>
            </div>

            {/* Aviso de tabelas desatualizadas */}
            <div
              className={
                calculo.sincronizacao.defasada
                  ? "flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
                  : "text-xs text-muted-foreground"
              }
            >
              {calculo.sincronizacao.defasada && <AlertTriangle className="size-4 shrink-0" />}
              {calculo.sincronizacao.ultima_ok_em
                ? `Tabelas sincronizadas em ${dataHora(calculo.sincronizacao.ultima_ok_em)}${
                    calculo.sincronizacao.defasada ? " — há mais de 3 dias, os valores podem estar desatualizados." : "."
                  }`
                : "As tabelas nunca foram sincronizadas com sucesso — vá na aba Sincronização."}
            </div>

            {/* Filtros rápidos */}
            {calculo.resultados.length > 0 && (
              <div className="flex flex-wrap items-end gap-2 pt-1">
                <div className="relative min-w-48 flex-1">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    className="h-9 pl-8"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Filtrar na lista (plano, linha...)"
                  />
                </div>
                <div className="w-36">
                  <FiltroSelect rotulo="Acomodação" valor={rapidoAcomodacao} onChange={setRapidoAcomodacao} opcoes={ACOMODACAO} />
                </div>
                <div className="w-36">
                  <FiltroSelect rotulo="Coparticipação" valor={rapidoCoparticipacao} onChange={setRapidoCoparticipacao} opcoes={COPARTICIPACAO} />
                </div>
                <div className="w-36">
                  <FiltroSelect rotulo="Linha" valor={rapidoLinha} onChange={setRapidoLinha} opcoes={LINHA} />
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {calculo.resultados.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma tabela serve para essa combinação. Veja abaixo o motivo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="w-8" />
                      <TableHead>Produto / operadora</TableHead>
                      <TableHead>Linha</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Acomodação</TableHead>
                      <TableHead>Coparticipação</TableHead>
                      <TableHead>Contratação</TableHead>
                      <TableHead className="text-right">Total mensal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiveis.map((r) => {
                      const chave = chaveOpcao(r);
                      const aberta = expandidas.has(chave);
                      return (
                        <React.Fragment key={chave}>
                          <TableRow data-state={selecionadas.has(chave) ? "selected" : undefined}>
                            <TableCell>
                              <Checkbox
                                checked={selecionadas.has(chave)}
                                onCheckedChange={() => setSelecionadas((s) => alternar(s, chave))}
                                aria-label={`Escolher ${r.plano}`}
                              />
                            </TableCell>
                            <TableCell>
                              <button
                                type="button"
                                aria-label={aberta ? "Recolher detalhes" : "Ver detalhes"}
                                onClick={() => setExpandidas((s) => alternar(s, chave))}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {aberta ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                              </button>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.produto ?? "—"}
                              {r.operadora && r.operadora !== r.produto && (
                                <span className="text-xs text-muted-foreground"> · {r.operadora}</span>
                              )}
                            </TableCell>
                            <TableCell>{r.linha ?? "—"}</TableCell>
                            <TableCell className="font-medium">{r.plano}</TableCell>
                            <TableCell>{r.acomodacao ?? "—"}</TableCell>
                            <TableCell>{r.coparticipacao ?? "—"}</TableCell>
                            <TableCell>{r.contratacao ?? "—"}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {brl(r.total)}
                            </TableCell>
                          </TableRow>
                          {aberta && (
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableCell />
                              <TableCell colSpan={8}>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 py-1 text-sm">
                                  {r.detalhamento.map((d, i) => (
                                    <span key={i} className="tabular-nums">
                                      <span className="text-muted-foreground">
                                        {d.idade} anos ({d.faixa}):
                                      </span>{" "}
                                      {brl(d.valor)}
                                    </span>
                                  ))}
                                  {r.desconto > 0 && (
                                    <span className="tabular-nums text-emerald-600">
                                      desconto {brl(r.desconto)}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
                {visiveis.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma opção com esses filtros rápidos.
                  </p>
                )}
              </div>
            )}

            {/* Por que alguma tabela não apareceu */}
            {motivosExcluidas.length > 0 && (
              <details className="mt-4 rounded-md border px-3 py-2 text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                  Por que algumas tabelas não apareceram? ({calculo.excluidas.length} descartadas)
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {motivosExcluidas.map(([motivo, qtd]) => (
                    <li key={motivo}>
                      <span className="font-medium tabular-nums">{qtd}×</span> {motivo}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
