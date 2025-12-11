// app/dashboard/cotacao-plano-saude/page.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Layout } from "@/components/Layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Stethoscope } from "lucide-react";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

type TipoPlano = "individual" | "familiar" | "pme";
type Acomodacao = "enfermaria" | "apartamento" | "ambulatorial" | "todos";
type Coparticipacao = "com" | "sem";

const FAIXAS = [
  "0-18",
  "19-23",
  "24-28",
  "29-33",
  "34-38",
  "39-43",
  "44-48",
  "49-53",
  "54-58",
  "59-100",
] as const;

type FaixaEtaria = (typeof FAIXAS)[number];

type PlanoSaude = {
  operadora: string;
  nomePlano: string;
  acomodacao: string;
  coparticipacao: string;
  faixaEtaria: string;
  preco: number;
  observacoes?: string;
};

type CotacaoPlanoSaudeResponse = {
  planos: PlanoSaude[];
  observacoesGerais?: string;
};

const CotacaoPlanoSaudePage = () => {
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const [tipoPlano, setTipoPlano] = useState<TipoPlano>("individual");
  const [acomodacao, setAcomodacao] = useState<Acomodacao>("enfermaria");
  const [coparticipacao, setCoparticipacao] = useState<Coparticipacao>("com");

  const [observacoes, setObservacoes] = useState("");

  const [faixas, setFaixas] = useState<Record<FaixaEtaria, number>>({
    "0-18": 0,
    "19-23": 0,
    "24-28": 0,
    "29-33": 0,
    "34-38": 0,
    "39-43": 0,
    "44-48": 0,
    "49-53": 0,
    "54-58": 0,
    "59-100": 0,
  });

  const [loadingCotacao, setLoadingCotacao] = useState(false);
  const [resultado, setResultado] =
    useState<CotacaoPlanoSaudeResponse | null>(null);

  const totalVidas = useMemo(
    () => Object.values(faixas).reduce((acc, qtd) => acc + (qtd || 0), 0),
    [faixas]
  );

  // estados básicos
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
            Você precisa estar logado para gerar cotações.
          </p>
          <p className="text-sm text-muted-foreground">
            Acesse a tela de login e entre com sua conta Google.
          </p>
        </div>
      </Layout>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResultado(null);

    if (!nome || !cidade || !estado) {
      toast.error("Preencha nome, cidade e estado.");
      return;
    }

    if (totalVidas <= 0) {
      toast.error("Selecione pelo menos 1 vida nas faixas etárias.");
      return;
    }

    try {
      setLoadingCotacao(true);

      const idToken = await firebaseUser.getIdToken();

      const res = await fetch("/api/cotacoes/plano-saude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          nome,
          cidade,
          estado,
          tipoPlano,
          acomodacao,
          coparticipacao,
          observacoes,
          faixasEtarias: faixas,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText);
      }

      const data = (await res.json()) as CotacaoPlanoSaudeResponse;
      setResultado(data);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.message || "Erro ao gerar cotação. Tente novamente em instantes."
      );
    } finally {
      setLoadingCotacao(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Cotação de Plano de Saúde
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Preencha os dados do cliente e do plano desejado. O sistema vai
              consultar os PDFs cadastrados e gerar uma tabela de opções.
            </p>
          </div>
        </div>

        {/* formulário em cima, resultado embaixo */}
        <div className="space-y-6">
          {/* FORMULÁRIO */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Dados da cotação</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Dados pessoais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome do cliente</Label>
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Maria Silva"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Ex: Florianópolis"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="estado">UF</Label>
                    <Input
                      id="estado"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      maxLength={2}
                      placeholder="SC"
                    />
                  </div>
                </div>

                <hr className="my-4 border-dashed" />

                {/* Dados do plano */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tipo de plano</Label>
                    <Select
                      value={tipoPlano}
                      onValueChange={(v) => setTipoPlano(v as TipoPlano)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="familiar">Familiar</SelectItem>
                        <SelectItem value="pme">PME / Empresarial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Faixas etárias</Label>
                    <div className="flex items-center gap-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" type="button">
                            Selecionar faixas
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Selecione as faixas etárias</DialogTitle>
                          </DialogHeader>

                          <div className="grid grid-cols-3 gap-4 py-4">
                            {FAIXAS.map((faixa) => (
                              <div
                                key={faixa}
                                className="flex flex-col items-center gap-1"
                              >
                                <span className="text-xs font-medium">
                                  {faixa.replace("-", " a ")}
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={faixas[faixa]}
                                  onChange={(e) =>
                                    setFaixas((prev) => ({
                                      ...prev,
                                      [faixa]: Number(e.target.value) || 0,
                                    }))
                                  }
                                  className="w-20 text-center"
                                />
                              </div>
                            ))}
                          </div>

                          <DialogClose asChild>
                            <Button className="w-full mt-2">Confirmar</Button>
                          </DialogClose>
                        </DialogContent>
                      </Dialog>

                      <span className="text-xs text-muted-foreground">
                        Total de vidas:{" "}
                        <span className="font-semibold">{totalVidas}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Informe quantas pessoas existem em cada faixa etária para
                      calcular a cotação.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Acomodação</Label>
                    <Select
                      value={acomodacao}
                      onValueChange={(v) => setAcomodacao(v as Acomodacao)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enfermaria">Enfermaria</SelectItem>
                        <SelectItem value="apartamento">Apartamento</SelectItem>
                        <SelectItem value="ambulatorial">Ambulatorial</SelectItem>
                        <SelectItem value="todos">Todos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Coparticipação</Label>
                    <Select
                      value={coparticipacao}
                      onValueChange={(v) =>
                        setCoparticipacao(v as Coparticipacao)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="com">
                          Com coparticipação
                        </SelectItem>
                        <SelectItem value="sem">
                          Sem coparticipação
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="obs">Observações (opcional)</Label>
                  <Textarea
                    id="obs"
                    rows={3}
                    placeholder="Ex: preferência por plano com obstetrícia, ou rede forte em determinado hospital..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                </div>

                <CardFooter className="px-0 pt-4">
                  <Button type="submit" disabled={loadingCotacao}>
                    {loadingCotacao && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Gerar cotação com IA
                  </Button>
                </CardFooter>
              </form>
            </CardContent>
          </Card>

          {/* RESULTADO */}
          <Card className="border border-border/60 bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Resultado da cotação</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCotacao && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando cotação com base nos PDFs cadastrados...
                </div>
              )}

              {!loadingCotacao && !resultado && (
                <p className="text-sm text-muted-foreground">
                  Preencha os dados acima e clique em{" "}
                  <span className="font-semibold">
                    “Gerar cotação com IA”
                  </span>
                  . O retorno será exibido aqui em forma de tabela.
                </p>
              )}

              {!loadingCotacao && resultado && (
                <div className="mt-2 rounded-lg border bg-background/80">
                  <div className="max-h-[450px] overflow-auto rounded-lg">
                    <Table className="w-full text-xs md:text-sm">
                      <TableHeader className="bg-muted/60">
                        <TableRow>
                          <TableHead className="px-3 py-2">
                            Operadora
                          </TableHead>
                          <TableHead className="px-3 py-2">
                            Plano
                          </TableHead>
                          <TableHead className="px-3 py-2">
                            Acomodação
                          </TableHead>
                          <TableHead className="px-3 py-2">
                            Copart.
                          </TableHead>
                          <TableHead className="px-3 py-2">
                            Faixa etária
                          </TableHead>
                          <TableHead className="px-3 py-2 text-right">
                            Valor mensal (R$)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultado.planos.map((plano, idx) => (
                          <TableRow
                            key={idx}
                            className="hover:bg-muted/40 transition-colors"
                          >
                            <TableCell className="px-3 py-2">
                              {plano.operadora}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              {plano.nomePlano}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              {plano.acomodacao}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              {plano.coparticipacao}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              {plano.faixaEtaria}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-right">
                              {plano.preco.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {resultado.observacoesGerais && (
                      <p className="text-[11px] md:text-xs text-muted-foreground px-3 py-2 border-t">
                        {resultado.observacoesGerais}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CotacaoPlanoSaudePage;
