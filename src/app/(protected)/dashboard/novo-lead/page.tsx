// app/novo-lead/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { UserPlus, Package } from "lucide-react";
import { formatPhoneNumber } from "@/lib/phoneMask";

type Lote = {
  id: string;
  data_acao: string; // ISO
  estado_regiao: string;
  volume_total_chamado: number;
};

const NovoLeadPage = () => {
  const router = useRouter();
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [loading, setLoading] = useState(false);
  const [loadingLote, setLoadingLote] = useState(false);
  const [lotes, setLotes] = useState<Lote[]>([]);

  // Lote fields
  const [qtdLigacao, setQtdLigacao] = useState<string>("0");
  const [qtdLeadsNovos, setQtdLeadsNovos] = useState<string>("0");
  const [qtdRetrabalhos, setQtdRetrabalhos] = useState<string>("0");
  const [qtdIndicacao, setQtdIndicacao] = useState<string>("0");
  const [qtdPresencial, setQtdPresencial] = useState<string>("0");
  const [estadoRegiao, setEstadoRegiao] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [loteId, setLoteId] = useState<string>("");

  // Lead fields - básicos
  const [origem, setOrigem] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [cidade, setCidade] = useState<string>("");
  const [telefone, setTelefone] = useState<string>("");

  // Lead fields - dados do seguro
  const [qtdVidas, setQtdVidas] = useState<string>("");
  const [idades, setIdades] = useState<string>("");
  const [possuiCNPJ, setPossuiCNPJ] = useState<boolean>(false);
  const [temPlanoAnterior, setTemPlanoAnterior] =
    useState<boolean>(false);
  const [operadoraAnterior, setOperadoraAnterior] =
    useState<string>("");
  const [tempoPlanoAnterior, setTempoPlanoAnterior] =
    useState<string>("");

  // Lead fields - proposta
  const [modalidade, setModalidade] = useState<string>("");
  const [operadoraOfertada, setOperadoraOfertada] =
    useState<string>("");
  const [acomodacao, setAcomodacao] = useState<string>("");
  const [valorMensalidade, setValorMensalidade] =
    useState<string>("");
  const [coparticipacao, setCoparticipacao] = useState<string>("");

  // Calcular volume total automaticamente
  const volumeTotal =
    parseInt(qtdLigacao || "0") +
    parseInt(qtdLeadsNovos || "0") +
    parseInt(qtdRetrabalhos || "0") +
    parseInt(qtdIndicacao || "0") +
    parseInt(qtdPresencial || "0");

  useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    fetchLotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, loadingAuth]);

  const fetchLotes = async () => {
    if (!firebaseUser) return;

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(`/api/lotes-producao?${params.toString()}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Erro ao carregar lotes:", body);
        return;
      }

      const data: Lote[] = await res.json();
      setLotes(data);

      // Pré-selecionar lote de hoje se existir
      const hoje = new Date().toISOString().split("T")[0];
      const loteHoje = data.find((l) =>
        l.data_acao.startsWith(hoje)
      );
      if (loteHoje) {
        setLoteId(loteHoje.id);
      }
    } catch (error) {
      console.error("Erro ao carregar lotes:", error);
    }
  };

  const handleCreateLote = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firebaseUser) {
      toast.error("Usuário não autenticado");
      return;
    }

    setLoadingLote(true);

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(`/api/lotes-producao?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volume_total_chamado: volumeTotal,
          qtd_ligacao: parseInt(qtdLigacao || "0"),
          qtd_leads_novos: parseInt(qtdLeadsNovos || "0"),
          qtd_retrabalhos: parseInt(qtdRetrabalhos || "0"),
          qtd_indicacao: parseInt(qtdIndicacao || "0"),
          qtd_presencial: parseInt(qtdPresencial || "0"),
          estado_regiao: estadoRegiao,
          observacoes: observacoes || null,
        }),
      });

      setLoadingLote(false);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao criar lote: " + (body.error || res.statusText)
        );
        return;
      }

      const data: Lote = await res.json();
      setLoteId(data.id);
      toast.success("Lote de produção criado com sucesso!");
      fetchLotes();

      // Limpar campos do lote
      setQtdLigacao("0");
      setQtdLeadsNovos("0");
      setQtdRetrabalhos("0");
      setQtdIndicacao("0");
      setQtdPresencial("0");
      setEstadoRegiao("");
      setObservacoes("");
    } catch (error) {
      console.error(error);
      setLoadingLote(false);
      toast.error("Erro ao criar lote");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!firebaseUser) {
      toast.error("Usuário não autenticado");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const nome = (formData.get("nome") as string) || "";

    try {
      const params = new URLSearchParams({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "",
      });

      const res = await fetch(`/api/leads?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          telefone: telefone || null,
          origem,
          estado,
          cidade,
          qtd_vidas: parseInt(qtdVidas),
          idades,
          possui_cnpj: possuiCNPJ || null,
          tem_plano_anterior: temPlanoAnterior || null,
          operadora_anterior: temPlanoAnterior
            ? operadoraAnterior || null
            : null,
          tempo_plano_anterior: temPlanoAnterior
            ? tempoPlanoAnterior || null
            : null,
          modalidade: modalidade || null,
          operadora_ofertada: operadoraOfertada || null,
          acomodacao: acomodacao || null,
          valor_mensalidade: valorMensalidade
            ? parseFloat(valorMensalidade)
            : null,
          coparticipacao: coparticipacao || null,
          status: "Abordagem",
          lote_producao_id: loteId,
        }),
      });

      setLoading(false);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          "Erro ao criar lead: " + (body.error || res.statusText)
        );
      } else {
        toast.success("Lead criado com sucesso!");
        router.push("/funil");
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
      toast.error("Erro ao criar lead");
    }
  };

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
            Você precisa estar logado para cadastrar leads.
          </p>
          <p className="text-sm text-muted-foreground">
            Acesse a tela de login e entre com sua conta.
          </p>
        </div>
      </Layout>
    );
  }

  const loteSelecionado = lotes.find((l) => l.id === loteId);
  const hoje = new Date().toISOString().split("T")[0];
  const textoLoteInfo =
    loteSelecionado && loteSelecionado.data_acao.startsWith(hoje)
      ? "Lote de hoje pré-selecionado"
      : "Selecione um lote de produção";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Seção Top: Criar Lote de Produção */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Lote de Produção</CardTitle>
                <CardDescription>
                  Registre o esforço realizado (ligações, visitas,
                  etc.)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreateLote}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <p className="text-sm font-medium mb-3">
                    Quantidade de Chamadas por Tipo
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="qtd-ligacao">Ligações</Label>
                      <Input
                        id="qtd-ligacao"
                        type="number"
                        min="0"
                        value={qtdLigacao}
                        onChange={(e) =>
                          setQtdLigacao(e.target.value)
                        }
                        className="text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qtd-leads-novos">
                        Leads Novos
                      </Label>
                      <Input
                        id="qtd-leads-novos"
                        type="number"
                        min="0"
                        value={qtdLeadsNovos}
                        onChange={(e) =>
                          setQtdLeadsNovos(e.target.value)
                        }
                        className="text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qtd-retrabalhos">
                        Retrabalhos
                      </Label>
                      <Input
                        id="qtd-retrabalhos"
                        type="number"
                        min="0"
                        value={qtdRetrabalhos}
                        onChange={(e) =>
                          setQtdRetrabalhos(e.target.value)
                        }
                        className="text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qtd-indicacao">
                        Indicações
                      </Label>
                      <Input
                        id="qtd-indicacao"
                        type="number"
                        min="0"
                        value={qtdIndicacao}
                        onChange={(e) =>
                          setQtdIndicacao(e.target.value)
                        }
                        className="text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qtd-presencial">
                        Presenciais
                      </Label>
                      <Input
                        id="qtd-presencial"
                        type="number"
                        min="0"
                        value={qtdPresencial}
                        onChange={(e) =>
                          setQtdPresencial(e.target.value)
                        }
                        className="text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-primary font-bold">
                        Total do Dia
                      </Label>
                      <div className="text-2xl font-bold text-primary pt-2">
                        {volumeTotal}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado-regiao">
                    Estado/Região *
                  </Label>
                  <Select
                    value={estadoRegiao}
                    onValueChange={setEstadoRegiao}
                    required
                  >
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-[300px]">
                      <SelectItem value="AC">Acre</SelectItem>
                      <SelectItem value="AL">Alagoas</SelectItem>
                      <SelectItem value="AP">Amapá</SelectItem>
                      <SelectItem value="AM">Amazonas</SelectItem>
                      <SelectItem value="BA">Bahia</SelectItem>
                      <SelectItem value="CE">Ceará</SelectItem>
                      <SelectItem value="DF">
                        Distrito Federal
                      </SelectItem>
                      <SelectItem value="ES">
                        Espírito Santo
                      </SelectItem>
                      <SelectItem value="GO">Goiás</SelectItem>
                      <SelectItem value="MA">Maranhão</SelectItem>
                      <SelectItem value="MT">
                        Mato Grosso
                      </SelectItem>
                      <SelectItem value="MS">
                        Mato Grosso do Sul
                      </SelectItem>
                      <SelectItem value="MG">
                        Minas Gerais
                      </SelectItem>
                      <SelectItem value="PA">Pará</SelectItem>
                      <SelectItem value="PB">Paraíba</SelectItem>
                      <SelectItem value="PR">Paraná</SelectItem>
                      <SelectItem value="PE">Pernambuco</SelectItem>
                      <SelectItem value="PI">Piauí</SelectItem>
                      <SelectItem value="RJ">
                        Rio de Janeiro
                      </SelectItem>
                      <SelectItem value="RN">
                        Rio Grande do Norte
                      </SelectItem>
                      <SelectItem value="RS">
                        Rio Grande do Sul
                      </SelectItem>
                      <SelectItem value="RO">Rondônia</SelectItem>
                      <SelectItem value="RR">Roraima</SelectItem>
                      <SelectItem value="SC">
                        Santa Catarina
                      </SelectItem>
                      <SelectItem value="SP">São Paulo</SelectItem>
                      <SelectItem value="SE">Sergipe</SelectItem>
                      <SelectItem value="TO">Tocantins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">
                    Observações (Opcional)
                  </Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Anotações sobre esta ação..."
                    value={observacoes}
                    onChange={(e) =>
                      setObservacoes(e.target.value)
                    }
                    className="text-base"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  loadingLote || !estadoRegiao || volumeTotal === 0
                }
                className="w-full"
              >
                {loadingLote
                  ? "Criando Lote..."
                  : "Criar Lote de Produção"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Seção Bottom: Cadastrar Lead */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Cadastrar Novo Lead</CardTitle>
                <CardDescription>
                  Adicione um novo lead vinculado ao lote de
                  produção
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Informações Básicas
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="lote">
                    Vincular ao Lote de Produção *
                  </Label>
                  <Select
                    value={loteId}
                    onValueChange={setLoteId}
                    required
                  >
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Selecione um lote" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-[300px]">
                      {lotes.map((lote) => (
                        <SelectItem
                          key={lote.id}
                          value={lote.id}
                        >
                          {new Date(
                            lote.data_acao
                          ).toLocaleDateString("pt-BR")}{" "}
                          - {lote.estado_regiao} (
                          {lote.volume_total_chamado} chamados)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {textoLoteInfo}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Lead *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    type="text"
                    placeholder="Ex: João Silva"
                    required
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">
                    Telefone/WhatsApp
                  </Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    type="tel"
                    placeholder="(11) 98765-4321"
                    value={telefone}
                    onChange={(e) =>
                      setTelefone(
                        formatPhoneNumber(e.target.value)
                      )
                    }
                    maxLength={15}
                    className="text-base"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origem">
                      Origem do Lead *
                    </Label>
                    <Select
                      value={origem}
                      onValueChange={setOrigem}
                      required
                    >
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="Lead Novo">
                          Lead Novo
                        </SelectItem>
                        <SelectItem value="Retrabalho">
                          Retrabalho
                        </SelectItem>
                        <SelectItem value="Ligação">
                          Ligação
                        </SelectItem>
                        <SelectItem value="Indicação">
                          Indicação
                        </SelectItem>
                        <SelectItem value="Presencial">
                          Presencial
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado *</Label>
                    <Select
                      value={estado}
                      onValueChange={setEstado}
                      required
                    >
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover max-h-[300px]">
                        <SelectItem value="AC">Acre</SelectItem>
                        <SelectItem value="AL">Alagoas</SelectItem>
                        <SelectItem value="AP">Amapá</SelectItem>
                        <SelectItem value="AM">Amazonas</SelectItem>
                        <SelectItem value="BA">Bahia</SelectItem>
                        <SelectItem value="CE">Ceará</SelectItem>
                        <SelectItem value="DF">
                          Distrito Federal
                        </SelectItem>
                        <SelectItem value="ES">
                          Espírito Santo
                        </SelectItem>
                        <SelectItem value="GO">Goiás</SelectItem>
                        <SelectItem value="MA">Maranhão</SelectItem>
                        <SelectItem value="MT">
                          Mato Grosso
                        </SelectItem>
                        <SelectItem value="MS">
                          Mato Grosso do Sul
                        </SelectItem>
                        <SelectItem value="MG">
                          Minas Gerais
                        </SelectItem>
                        <SelectItem value="PA">Pará</SelectItem>
                        <SelectItem value="PB">Paraíba</SelectItem>
                        <SelectItem value="PR">Paraná</SelectItem>
                        <SelectItem value="PE">Pernambuco</SelectItem>
                        <SelectItem value="PI">Piauí</SelectItem>
                        <SelectItem value="RJ">
                          Rio de Janeiro
                        </SelectItem>
                        <SelectItem value="RN">
                          Rio Grande do Norte
                        </SelectItem>
                        <SelectItem value="RS">
                          Rio Grande do Sul
                        </SelectItem>
                        <SelectItem value="RO">Rondônia</SelectItem>
                        <SelectItem value="RR">Roraima</SelectItem>
                        <SelectItem value="SC">
                          Santa Catarina
                        </SelectItem>
                        <SelectItem value="SP">São Paulo</SelectItem>
                        <SelectItem value="SE">Sergipe</SelectItem>
                        <SelectItem value="TO">Tocantins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    type="text"
                    placeholder="Ex: São Paulo"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    required
                    className="text-base"
                  />
                </div>
              </div>

              {/* Dados do Seguro */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Dados do Seguro Saúde
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qtd-vidas">
                      Quantidade de Vidas *
                    </Label>
                    <Input
                      id="qtd-vidas"
                      type="number"
                      min="1"
                      placeholder="Ex: 3"
                      value={qtdVidas}
                      onChange={(e) =>
                        setQtdVidas(e.target.value)
                      }
                      required
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idades">Idades *</Label>
                    <Input
                      id="idades"
                      type="text"
                      placeholder="Ex: 34, 30, 5"
                      value={idades}
                      onChange={(e) =>
                        setIdades(e.target.value)
                      }
                      required
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separe as idades por vírgula
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="possui-cnpj"
                    checked={possuiCNPJ}
                    onCheckedChange={setPossuiCNPJ}
                  />
                  <Label
                    htmlFor="possui-cnpj"
                    className="cursor-pointer"
                  >
                    Possui CNPJ
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="tem-plano-anterior"
                    checked={temPlanoAnterior}
                    onCheckedChange={setTemPlanoAnterior}
                  />
                  <Label
                    htmlFor="tem-plano-anterior"
                    className="cursor-pointer"
                  >
                    Tem Plano de Saúde Anterior
                  </Label>
                </div>

                {temPlanoAnterior && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="operadora-anterior">
                        Operadora Anterior
                      </Label>
                      <Input
                        id="operadora-anterior"
                        type="text"
                        placeholder="Ex: Unimed"
                        value={operadoraAnterior}
                        onChange={(e) =>
                          setOperadoraAnterior(
                            e.target.value
                          )
                        }
                        className="text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tempo-plano-anterior">
                        Tempo de Plano Anterior
                      </Label>
                      <Input
                        id="tempo-plano-anterior"
                        type="text"
                        placeholder="Ex: 2 anos"
                        value={tempoPlanoAnterior}
                        onChange={(e) =>
                          setTempoPlanoAnterior(
                            e.target.value
                          )
                        }
                        className="text-base"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Proposta (Opcional) */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Proposta Ofertada (Opcional)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modalidade">Modalidade</Label>
                    <Select
                      value={modalidade}
                      onValueChange={setModalidade}
                    >
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="PF">
                          PF (Pessoa Física)
                        </SelectItem>
                        <SelectItem value="Adesão">
                          Adesão
                        </SelectItem>
                        <SelectItem value="Empresarial">
                          Empresarial
                        </SelectItem>
                        <SelectItem value="PME">
                          PME
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="operadora-ofertada">
                      Operadora Ofertada
                    </Label>
                    <Input
                      id="operadora-ofertada"
                      type="text"
                      placeholder="Ex: Bradesco Saúde"
                      value={operadoraOfertada}
                      onChange={(e) =>
                        setOperadoraOfertada(
                          e.target.value
                        )
                      }
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="acomodacao">
                      Acomodação
                    </Label>
                    <Select
                      value={acomodacao}
                      onValueChange={setAcomodacao}
                    >
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="Enfermaria">
                          Enfermaria
                        </SelectItem>
                        <SelectItem value="Apartamento">
                          Apartamento
                        </SelectItem>
                        <SelectItem value="Ambulatorial">
                          Ambulatorial
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor-mensalidade">
                      Valor da Mensalidade (R$)
                    </Label>
                    <Input
                      id="valor-mensalidade"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 450.00"
                      value={valorMensalidade}
                      onChange={(e) =>
                        setValorMensalidade(
                          e.target.value
                        )
                      }
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coparticipacao">
                      Coparticipação
                    </Label>
                    <Select
                      value={coparticipacao}
                      onValueChange={setCoparticipacao}
                    >
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="Total">
                          Total
                        </SelectItem>
                        <SelectItem value="Parcial">
                          Parcial
                        </SelectItem>
                        <SelectItem value="Isenta">
                          Isenta
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/funil")}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !origem ||
                    !estado ||
                    !cidade ||
                    !qtdVidas ||
                    !idades ||
                    !loteId
                  }
                  className="flex-1"
                >
                  {loading ? "Criando..." : "Criar Lead"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default NovoLeadPage;
