"use client";

import { useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Layout } from "@/components/Layout";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";

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

import { Check, ChevronsUpDown } from "lucide-react";
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
      <div className="mx-auto max-w-5xl p-4 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Cotação</h1>
          <Badge variant="secondary">Fluxo curto</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-3">
            <div className="text-sm">
              <div className="text-muted-foreground">Tipo</div>
              <div className="font-medium">{segment}</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Local</div>
              <div className="font-medium">
                {selectedCity ? `${selectedCity.name}/${selectedCity.uf}` : "—"}
              </div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Vidas</div>
              <div className="font-medium">{lives}</div>
            </div>
          </CardContent>
        </Card>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>1) Tipo de cotação</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>2) Local</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle>3) Pessoas</CardTitle>
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

              {error && <div className="text-sm text-red-600">{error}</div>}

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
          <Card>
            <CardHeader>
              <CardTitle>4) Resultados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Mostrando até 30 opções ordenadas por menor preço.
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {options.map((op) => (
                  <Card
                    key={op.rateCardId}
                    className="border-t-4"
                    style={{ borderTopColor: op.operator.colorHex }}
                  >
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div
                          className="font-semibold"
                          style={{ color: op.operator.colorHex }}
                        >
                          {op.operator.name}
                        </div>
                        <Badge variant="secondary">{op.accommodation}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {op.product.commercialName}
                      </div>
                      <div className="font-medium">
                        {op.planVariant.planName}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-2xl font-semibold">
                        {money(op.total)}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Detalhe por pessoa
                      </div>
                      <div className="space-y-1">
                        {op.breakdown.map((b, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm"
                          >
                            <span>
                              {b.age} anos × {b.qty}
                            </span>
                            <span>{money(b.subtotal)}</span>
                          </div>
                        ))}
                      </div>

                      <Button className="w-full" variant="outline">
                        Selecionar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  Voltar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setOptions([]);
                    setError(null);
                  }}
                >
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
