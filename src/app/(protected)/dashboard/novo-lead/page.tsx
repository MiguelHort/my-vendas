// app/novo-lead/page.tsx
"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  AlertCircle,
  User,
  Users,
  FileText,
} from "lucide-react";
import { formatPhoneNumber } from "@/lib/phoneMask";
import Image from "next/image";
import { OPERADORAS } from "@/components/LeadCard";

// ========================
// ETAPAS DO WIZARD
// ========================

const STEPS = [
  { id: 1, title: "Dados Básicos", description: "Nome, contato e localização", optional: false },
  { id: 2, title: "Perfil do Lead", description: "Vidas, idades e plano atual", optional: false },
  { id: 3, title: "Proposta Ofertada", description: "Operadora, modalidade e valores", optional: true },
];

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

// ========================
// PAGE
// ========================

const NovoLeadPage = () => {
  const router = useRouter();
  const [firebaseUser, loadingAuth] = useAuthState(auth);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Dados básicos
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");

  // Step 2 — Perfil
  const [qtdVidas, setQtdVidas] = useState("");
  const [idades, setIdades] = useState("");
  const [possuiCNPJ, setPossuiCNPJ] = useState(false);
  const [temPlanoAnterior, setTemPlanoAnterior] = useState(false);
  const [operadoraAnterior, setOperadoraAnterior] = useState("");
  const [tempoPlanoAnterior, setTempoPlanoAnterior] = useState("");

  // Step 3 — Proposta (opcional)
  const [tipoComissao, setTipoComissao] = useState<"interno" | "externo">("interno");
  const [modalidade, setModalidade] = useState("");
  const [operadoraOfertada, setOperadoraOfertada] = useState("");
  const [operadoraCustom, setOperadoraCustom] = useState(false);
  const [acomodacao, setAcomodacao] = useState("");
  const [valorMensalidade, setValorMensalidade] = useState("");
  const [coparticipacao, setCoparticipacao] = useState("");

  // ========================
  // VALIDAÇÕES POR ETAPA
  // ========================

  const canAdvanceStep1 = !!nome.trim() && !!origem && !!estado && !!cidade.trim();
  const canAdvanceStep2 = !!qtdVidas && !!idades.trim();

  const canAdvance = () => {
    if (currentStep === 1) return canAdvanceStep1;
    if (currentStep === 2) return canAdvanceStep2;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSkip = () => {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  };

  // ========================
  // SUBMIT FINAL
  // ========================

  const handleSubmit = async () => {
    if (!firebaseUser) {
      toast.error("Usuário não autenticado");
      return;
    }
    setLoading(true);
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
          operadora_anterior: temPlanoAnterior ? operadoraAnterior || null : null,
          tempo_plano_anterior: temPlanoAnterior ? tempoPlanoAnterior || null : null,
          modalidade: modalidade || null,
          operadora_ofertada: operadoraOfertada || null,
          acomodacao: acomodacao || null,
          valor_mensalidade: valorMensalidade ? parseFloat(valorMensalidade) : null,
          coparticipacao: coparticipacao || null,
          tipo_comissao: tipoComissao,
          status: "Backlog",
        }),
      });

      setLoading(false);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Erro ao criar lead: " + (body.error || res.statusText));
      } else {
        toast.success("Lead criado com sucesso!");
        router.push("/dashboard/funil");
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
      toast.error("Erro ao criar lead");
    }
  };

  // ========================
  // RENDER
  // ========================

  if (loadingAuth) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-80 rounded-2xl" />
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
            Você precisa estar logado para cadastrar leads.
          </p>
          <p className="text-sm text-muted-foreground">
            Acesse a tela de login e entre com sua conta.
          </p>
        </div>
      </Layout>
    );
  }

  const progressPct = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  const currentStepInfo = STEPS[currentStep - 1];
  const isLastStep = currentStep === STEPS.length;

  const stepIcons = [User, Users, FileText];
  const StepIcon = stepIcons[currentStep - 1] || User;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">CRM · Novo Lead</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Novo Lead</h1>
          <p className="text-sm text-muted-foreground">
            Etapa {currentStep} de {STEPS.length} — {currentStepInfo.title}
            {currentStepInfo.optional && (
              <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                opcional
              </span>
            )}
          </p>
        </header>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Progress value={progressPct} className="h-1.5 flex-1" />
            <span className="text-xs font-medium tabular-nums text-muted-foreground shrink-0">
              {currentStep}/{STEPS.length}
            </span>
          </div>
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep) setCurrentStep(step.id);
                }}
                className={`text-xs transition-colors ${
                  step.id === currentStep
                    ? "text-primary font-semibold"
                    : step.id < currentStep
                    ? "text-primary/60 cursor-pointer hover:text-primary"
                    : "text-muted-foreground cursor-default"
                }`}
              >
                {step.id}. {step.title}
              </button>
            ))}
          </div>
        </div>

        {/* Card da etapa */}
        <Card className="border-muted-foreground/10 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                <StepIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">{currentStepInfo.title}</CardTitle>
                <CardDescription className="text-xs">{currentStepInfo.description}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">

            {/* ── STEP 1: DADOS BÁSICOS ── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Lead *</Label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone/WhatsApp</Label>
                  <Input
                    type="tel"
                    placeholder="(11) 98765-4321"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhoneNumber(e.target.value))}
                    maxLength={15}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Origem do Lead *</Label>
                    <Select value={origem} onValueChange={setOrigem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="Lead Novo">Lead Novo</SelectItem>
                        <SelectItem value="Retrabalho">Retrabalho</SelectItem>
                        <SelectItem value="Ligação">Ligação</SelectItem>
                        <SelectItem value="Indicação">Indicação</SelectItem>
                        <SelectItem value="Presencial">Presencial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado *</Label>
                    <Select value={estado} onValueChange={setEstado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover max-h-60">
                        {ESTADOS.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cidade *</Label>
                  <Input
                    placeholder="Ex: São Paulo"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ── STEP 2: PERFIL ── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade de Vidas *</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ex: 3"
                      value={qtdVidas}
                      onChange={(e) => setQtdVidas(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Idades *</Label>
                    <Input
                      placeholder="Ex: 34, 30, 5"
                      value={idades}
                      onChange={(e) => setIdades(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Separe por vírgula</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="possui-cnpj"
                    checked={possuiCNPJ}
                    onCheckedChange={setPossuiCNPJ}
                  />
                  <Label htmlFor="possui-cnpj" className="cursor-pointer">
                    Possui CNPJ
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="tem-plano-anterior"
                    checked={temPlanoAnterior}
                    onCheckedChange={setTemPlanoAnterior}
                  />
                  <Label htmlFor="tem-plano-anterior" className="cursor-pointer">
                    Tem Plano de Saúde Anterior
                  </Label>
                </div>

                {temPlanoAnterior && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border bg-muted/20">
                    <div className="space-y-2">
                      <Label>Operadora Anterior</Label>
                      <Input
                        placeholder="Ex: Unimed"
                        value={operadoraAnterior}
                        onChange={(e) => setOperadoraAnterior(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tempo de Plano</Label>
                      <Input
                        placeholder="Ex: 2 anos"
                        value={tempoPlanoAnterior}
                        onChange={(e) => setTempoPlanoAnterior(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: PROPOSTA (opcional) ── */}
            {currentStep === 3 && (
              <div className="space-y-4">

                {/* Tipo de comissão */}
                <div className="space-y-2">
                  <Label>Tipo de Comissão</Label>
                  <div className="flex gap-2">
                    {(["interno", "externo"] as const).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setTipoComissao(tipo)}
                        className="flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all capitalize"
                        style={{
                          borderColor: tipoComissao === tipo ? "#8b5cf6" : "transparent",
                          backgroundColor: tipoComissao === tipo ? "#8b5cf620" : "#f3f4f6",
                          color: tipoComissao === tipo ? "#7c3aed" : "#6b7280",
                        }}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modalidade</Label>
                    <Select value={modalidade} onValueChange={setModalidade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="PF">PF (Pessoa Física)</SelectItem>
                        <SelectItem value="Adesão">Adesão</SelectItem>
                        <SelectItem value="Empresarial">Empresarial</SelectItem>
                        <SelectItem value="PME">PME</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Acomodação</Label>
                    <Select value={acomodacao} onValueChange={setAcomodacao}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="Enfermaria">Enfermaria</SelectItem>
                        <SelectItem value="Apartamento">Apartamento</SelectItem>
                        <SelectItem value="Ambulatorial">Ambulatorial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Operadora visual */}
                <div className="space-y-2">
                  <Label>Operadora Ofertada</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {OPERADORAS.map((op) => (
                      <button
                        key={op.nome}
                        type="button"
                        onClick={() => {
                          setOperadoraOfertada(op.nome);
                          setOperadoraCustom(false);
                        }}
                        className="flex items-center justify-center p-2 rounded border-2 transition-all"
                        style={{
                          backgroundColor: op.cor + "22",
                          borderColor:
                            operadoraOfertada === op.nome && !operadoraCustom
                              ? op.cor
                              : "transparent",
                        }}
                        title={op.nome}
                      >
                        <Image
                          src={op.logo}
                          alt={op.nome}
                          width={80}
                          height={20}
                          className="h-5 w-auto object-contain"
                        />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setOperadoraCustom(true);
                        setOperadoraOfertada("");
                      }}
                      className="px-2 py-2 rounded text-xs font-medium border-2 transition-all"
                      style={{
                        borderColor: operadoraCustom ? "#6b7280" : "transparent",
                        backgroundColor: "#6b728022",
                        color: "#6b7280",
                      }}
                    >
                      Outra...
                    </button>
                  </div>
                  {operadoraCustom && (
                    <Input
                      placeholder="Nome da operadora"
                      value={operadoraOfertada}
                      onChange={(e) => setOperadoraOfertada(e.target.value)}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor da Mensalidade (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 450.00"
                      value={valorMensalidade}
                      onChange={(e) => setValorMensalidade(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coparticipação</Label>
                    <Select value={coparticipacao} onValueChange={setCoparticipacao}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="Total">Total</SelectItem>
                        <SelectItem value="Parcial">Parcial</SelectItem>
                        <SelectItem value="Isenta">Isenta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Navegação */}
        <div className="flex gap-3">
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}

          <div className="flex-1" />

          {currentStepInfo.optional && (
            <Button type="button" variant="ghost" onClick={handleSkip} className="gap-2 text-muted-foreground">
              <SkipForward className="h-4 w-4" />
              Pular
            </Button>
          )}

          {isLastStep ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? "Criando..." : "Criar Lead"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance()}
              className="gap-2"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default NovoLeadPage;
