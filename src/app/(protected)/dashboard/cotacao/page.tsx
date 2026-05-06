"use client";

import { useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Layout } from "@/components/Layout";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import {
  Check,
  ChevronsUpDown,
  AlertCircle,
  CircleDollarSign,
  MapPin,
  Users,
  SlidersHorizontal,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Segment = "PF" | "PME" | "ADESAO";
type Accommodation = "ANY" | "ENFERMARIA" | "APARTAMENTO";
type Adhesion = "ANY" | "LIVRE_ADESAO" | "COMPULSORIO";

type CityItem = {
  id: string;
  name: string;
  uf: string;
  area: { id: string; name: string };
};

type AgeQty = { age: number; qty: number };

type Option = {
  rateCardId: string;
  operator: { id: string; name: string; colorHex?: string };
  product: { id: string; commercialName: string };
  planVariant: { id: string; planName: string; coverageJson: any };
  area: { id: string; name: string };
  accommodation: string;
  adhesionType: string | null;
  total: number;
  breakdown: Array<{
    age: number;
    qty: number;
    unit: number;
    subtotal: number;
  }>;
};

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CotacaoPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // passo 1
  const [segment, setSegment] = useState<Segment>("PF");

  // passo 2 (cidade)
  const [openCity, setOpenCity] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityResults, setCityResults] = useState<CityItem[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityItem | null>(null);

  // passo 3 (pessoas)
  const [pfAges, setPfAges] = useState<number[]>([56]);
  const lives = useMemo(() => pfAges.length, [pfAges]);

  // filtros opcionais pra passo 4
  const [accommodation, setAccommodation] = useState<Accommodation>("ANY");
  const [adhesion, setAdhesion] = useState<Adhesion>("ANY");

  // resultados
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);

  const agesPayload: AgeQty[] = useMemo(() => {
    return pfAges.map((age) => ({ age, qty: 1 }));
  }, [pfAges]);

  async function searchCities(q: string) {
    const query = (q ?? "").trim();

    if (query.length < 2) {
      setCityResults([]);
      return;
    }

    setCityLoading(true);
    try {
      const res = await fetch(
        `/api/cotacoes/cidades?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setCityResults(data.items ?? []);
    } finally {
      setCityLoading(false);
    }
  }

  async function buscarPlanos() {
    if (!selectedCity) return;

    setLoading(true);
    setError(null);
    setOptions([]);

    try {
      const res = await fetch("/api/cotacoes/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment,
          areaId: selectedCity.area.id,
          lives,
          ages: agesPayload,
          accommodation,
          adhesionType: segment === "PME" ? adhesion : "ANY",
        }),
      });

      if (!res.ok) throw new Error("Falha na busca");
      const data = await res.json();
      setOptions(data.options ?? []);
      setStep(4);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao buscar");
    } finally {
      setLoading(false);
    }
  }

  // ----------------- estados de loading / auth -----------------
  if (loadingAuth) {
    return (
      <Layout>
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
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
            Você precisa estar logado para acessar a cotação.
          </p>
          <p className="text-sm text-muted-foreground">
            Acesse a tela de login e entre com sua conta.
          </p>
        </div>
      </Layout>
    );
  }

  // ----------------- UI -----------------
  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CircleDollarSign className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Cotação de Planos</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Cotação</h1>
          <p className="text-sm text-muted-foreground">
            Compare planos de saúde por cidade, perfil e acomodação.
          </p>
        </header>

        <Card className="border-muted-foreground/10 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Resumo da Cotação</CardTitle>
                <CardDescription className="text-xs">Configurações selecionadas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-semibold">{segment}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Local</p>
              <p className="text-sm font-semibold truncate">
                {selectedCity ? `${selectedCity.name}/${selectedCity.uf}` : "—"}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Vidas</p>
              <p className="text-sm font-semibold tabular-nums">{lives}</p>
            </div>
          </CardContent>
        </Card>

        {step === 1 && (
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                  <CircleDollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Tipo de Cotação</CardTitle>
                  <CardDescription className="text-xs">Selecione o segmento do plano</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-3">
                <Button
                  variant={segment === "PF" ? "default" : "outline"}
                  onClick={() => setSegment("PF")}
                >
                  PF / Coletivo
                </Button>
                <Button
                  variant={segment === "PME" ? "default" : "outline"}
                  onClick={() => setSegment("PME")}
                >
                  PME até 29 vidas
                </Button>
                <Button variant="outline" disabled>
                  PJ +30 vidas (em breve)
                </Button>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>Avançar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Local</CardTitle>
                  <CardDescription className="text-xs">Selecione a cidade para a cotação</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cidade</Label>

                <Popover open={openCity} onOpenChange={setOpenCity}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedCity
                        ? `${selectedCity.name}/${selectedCity.uf} — ${selectedCity.area.name}`
                        : "Selecione a cidade"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Digite a cidade..."
                        onValueChange={searchCities}
                      />
                      <CommandEmpty>
                        {cityLoading
                          ? "Buscando..."
                          : "Nenhuma cidade encontrada"}
                      </CommandEmpty>

                      <CommandGroup>
                        {cityResults.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.name}-${c.uf}`}
                            onSelect={() => {
                              setSelectedCity(c);
                              setOpenCity(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCity?.id === c.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {c.name}/{c.uf} — {c.area.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <p className="text-xs text-muted-foreground">
                  Digite ao menos 2 letras para buscar no banco.
                </p>
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button onClick={() => setStep(3)} disabled={!selectedCity}>
                  Avançar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Pessoas</CardTitle>
                  <CardDescription className="text-xs">Informe as idades dos beneficiários</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {segment === "PF" || "PME" ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Informe as idades (1 por pessoa). Ex: 56
                  </div>

                  <div className="space-y-2">
                    {pfAges.map((age, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          type="number"
                          value={age}
                          onChange={(e) => {
                            const v = Number(e.target.value || 0);
                            setPfAges((prev) =>
                              prev.map((p, i) => (i === idx ? v : p))
                            );
                          }}
                          className="w-32"
                          min={0}
                        />
                        <Button
                          variant="outline"
                          onClick={() =>
                            setPfAges((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          disabled={pfAges.length === 1}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setPfAges((prev) => [...prev, 30])}
                  >
                    + Adicionar pessoa
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  PME: aqui você pode trocar pra grid de faixas (0-18, 19-23,
                  etc). Mantive PF pronto e PME você replica.
                </div>
              )}

              <Separator />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Acomodação</Label>
                  <Select
                    value={accommodation}
                    onValueChange={(v) => setAccommodation(v as Accommodation)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANY">Tanto faz</SelectItem>
                      <SelectItem value="ENFERMARIA">Enfermaria</SelectItem>
                      <SelectItem value="APARTAMENTO">Apartamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {segment === "PME" && (
                  <div className="space-y-2">
                    <Label>Adesão</Label>
                    <Select
                      value={adhesion}
                      onValueChange={(v) => setAdhesion(v as Adhesion)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANY">Tanto faz</SelectItem>
                        <SelectItem value="LIVRE_ADESAO">
                          Livre adesão
                        </SelectItem>
                        <SelectItem value="COMPULSORIO">Compulsório</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <Button
                  onClick={buscarPlanos}
                  disabled={loading || !selectedCity}
                >
                  {loading ? "Buscando..." : "Ver resultados"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="border-muted-foreground/10 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Resultados</CardTitle>
                  <CardDescription className="text-xs">
                    {options.length} opções ordenadas por menor preço
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {options.map((op) => (
                  <Card
                    key={op.rateCardId}
                    className="border-muted-foreground/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative"
                  >
                    {op.operator.colorHex && (
                      <div
                        className="absolute top-0 left-0 right-0 h-[3px]"
                        style={{ backgroundColor: op.operator.colorHex }}
                      />
                    )}
                    <CardHeader className="space-y-1 pt-5">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="font-semibold text-sm"
                          style={{ color: op.operator.colorHex }}
                        >
                          {op.operator.name}
                        </div>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-muted-foreground/20 bg-muted text-muted-foreground shrink-0">
                          {op.accommodation}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {op.product.commercialName}
                      </div>
                      <div className="text-sm font-medium">
                        {op.planVariant.planName}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-2xl font-bold tabular-nums">
                        {money(op.total)}
                      </p>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Detalhe por pessoa</p>
                        {op.breakdown.map((b, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-xs text-muted-foreground"
                          >
                            <span>{b.age} anos × {b.qty}</span>
                            <span className="tabular-nums">{money(b.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                      <Button className="w-full" variant="outline" size="sm">
                        Selecionar plano
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  Voltar
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setStep(1);
                    setOptions([]);
                    setError(null);
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Nova cotação
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
