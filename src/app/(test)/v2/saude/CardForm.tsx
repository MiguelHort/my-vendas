// app/CardForm.tsx
"use client";

import * as React from "react";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  PartyPopper,
  Phone,
  Rocket,
  ShieldCheck,
  Sparkles,
  User,
  ArrowLeft,
  ArrowRight,
  MapPin,
  MessageCircle,
  Heart,
  Users,
  Stethoscope,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type StepId = 1 | 2 | 3 | 4 | 5;
type Modality = "PF" | "PJ" | "MEI";
type CityOption = { value: string; label: string };

// ✅ Sempre cadastrar no “usuário dono” (via firebaseUid/email/name)
const OWNER_FIREBASE_UID = "nzwXmCbN4DcC1Aiag8wgqR4gQD23";
const OWNER_EMAIL = "suporte@winleads.com.br";
const OWNER_NAME = "Suporte Winleads";

const UF = [
  { value: "AC", label: "AC - Acre" },
  { value: "AL", label: "AL - Alagoas" },
  { value: "AP", label: "AP - Amapá" },
  { value: "AM", label: "AM - Amazonas" },
  { value: "BA", label: "BA - Bahia" },
  { value: "CE", label: "CE - Ceará" },
  { value: "DF", label: "DF - Distrito Federal" },
  { value: "ES", label: "ES - Espírito Santo" },
  { value: "GO", label: "GO - Goiás" },
  { value: "MA", label: "MA - Maranhão" },
  { value: "MT", label: "MT - Mato Grosso" },
  { value: "MS", label: "MS - Mato Grosso do Sul" },
  { value: "MG", label: "MG - Minas Gerais" },
  { value: "PA", label: "PA - Pará" },
  { value: "PB", label: "PB - Paraíba" },
  { value: "PR", label: "PR - Paraná" },
  { value: "PE", label: "PE - Pernambuco" },
  { value: "PI", label: "PI - Piauí" },
  { value: "RJ", label: "RJ - Rio de Janeiro" },
  { value: "RN", label: "RN - Rio Grande do Norte" },
  { value: "RS", label: "RS - Rio Grande do Sul" },
  { value: "RO", label: "RO - Rondônia" },
  { value: "RR", label: "RR - Roraima" },
  { value: "SC", label: "SC - Santa Catarina" },
  { value: "SP", label: "SP - São Paulo" },
  { value: "SE", label: "SE - Sergipe" },
  { value: "TO", label: "TO - Tocantins" },
];

const FALLBACK_CITIES: CityOption[] = [
  { value: "Outra", label: "Outra (selecionar e informar depois)" },
];

const PROFESSIONS = [
  "Autônomo(a) / Freelancer",
  "Empresário(a) / Dono(a) de Negócio",
  "CLT (Empregado(a) com carteira)",
  "Servidor(a) Público(a)",
  "MEI (Microempreendedor Individual)",
  "Profissional Liberal (ex: médico, dentista, advogado, contador)",
  "Comerciante / Lojista",
  "Vendedor(a) / Representante Comercial",
  "Motorista (App / Entregas / Transporte)",
  "Professor(a) / Educação",
  "Área Administrativa (Administração / RH / Financeiro)",
  "Área de Tecnologia (TI / Dev / Suporte)",
  "Área da Saúde (Enfermagem / Técnico / Saúde em geral)",
  "Área de Engenharia / Construção",
  "Serviços Gerais (Manutenção / Limpeza / Portaria)",
  "Operacional / Produção (Indústria / Estoque)",
  "Agricultura / Campo",
  "Estudante",
  "Desempregado(a)",
  "Aposentado(a)",
  "Outro",
];

const AGE_BUCKETS = [
  { key: "0_18", label: "0 a 18 anos" },
  { key: "19_23", label: "19 a 23 anos" },
  { key: "24_28", label: "24 a 28 anos" },
  { key: "29_33", label: "29 a 33 anos" },
  { key: "34_38", label: "34 a 38 anos" },
  { key: "39_43", label: "39 a 43 anos" },
  { key: "44_48", label: "44 a 48 anos" },
  { key: "49_53", label: "49 a 53 anos" },
  { key: "54_58", label: "54 a 58 anos" },
  { key: "59+", label: "59+ anos" },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}
function formatPhoneBR(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function firstName(full: string) {
  return (full || "").trim().split(/\s+/)[0] || "";
}

function BrandPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
        "bg-emerald-50/70 text-emerald-800 border border-emerald-200/70",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CounterRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="text-sm">{label}</div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full",
            "hover:border-emerald-200 hover:bg-emerald-50",
          )}
          onClick={() => onChange(clamp(value - 1, 0, 99))}
          aria-label={`Diminuir ${label}`}
        >
          –
        </Button>
        <div className="w-7 text-center text-sm font-medium tabular-nums">
          {value}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full",
            "hover:border-emerald-200 hover:bg-emerald-50",
          )}
          onClick={() => onChange(clamp(value + 1, 0, 99))}
          aria-label={`Aumentar ${label}`}
        >
          +
        </Button>
      </div>
    </div>
  );
}

// ---- IBGE helpers (client-side) ----
const IBGE_CACHE = new Map<string, CityOption[]>();

async function fetchCitiesByUF(
  uf: string,
  signal?: AbortSignal,
): Promise<CityOption[]> {
  const key = uf.toUpperCase().trim();
  if (!key) return [];
  const cached = IBGE_CACHE.get(key);
  if (cached) return cached;

  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(
      key,
    )}/municipios`,
    { signal },
  );

  if (!res.ok) {
    throw new Error(`Falha ao buscar cidades do IBGE (${key}).`);
  }

  const data: Array<{ nome: string }> = await res.json();

  const cities: CityOption[] = data
    .map((c) => c?.nome?.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((name) => ({ value: name, label: name }));

  IBGE_CACHE.set(key, cities);
  return cities;
}

function SelectField({
  icon,
  placeholder,
  value,
  onValueChange,
  disabled,
  children,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "h-14 rounded-2xl bg-background/80 text-base",
          "focus:ring-2 focus:ring-emerald-500/35 focus:border-emerald-300",
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-[320px]">{children}</SelectContent>
    </Select>
  );
}

const CTA =
  "w-full h-14 rounded-2xl text-base bg-emerald-300/70 text-emerald-950 hover:bg-emerald-300 shadow-[0_14px_34px_-22px_rgba(16,185,129,0.85)] disabled:opacity-60 disabled:shadow-none";

function StepHeader({ step }: { step: StepId }) {
  const percent = step * 20;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>Etapa {step} de 5</div>
        <div>{percent}% concluído</div>
      </div>
      <div className="mt-2 h-2.5 w-full rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
          aria-label={`Progresso: ${percent}%`}
        />
      </div>
    </div>
  );
}

function OptionCard({
  title,
  subtitle,
  icon,
  selected,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-5 transition-all",
        selected
          ? "border-emerald-300 bg-emerald-50/60 shadow-sm"
          : "border-border hover:bg-emerald-50/30 hover:border-emerald-200/70 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 h-10 w-10 rounded-xl border flex items-center justify-center shadow-sm",
            selected
              ? "border-emerald-300 bg-white"
              : "border-border bg-background",
          )}
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
        </div>
      </div>
    </button>
  );
}

function buildIdadesString(ageCounts: Record<string, number>) {
  const parts = AGE_BUCKETS.map((b) => {
    const n = Number(ageCounts[b.key] ?? 0);
    if (!n) return null;
    return `${b.label}: ${n}`;
  }).filter(Boolean) as string[];

  return parts.join("; ");
}

function mapOrigem() {
  return "Formulário (Landing)";
}

type LeadFromApi = {
  id: string;
  nome: string;
  origem: string;
  estado: string;
  cidade: string;
  telefone: string | null;
  data_entrada: string;
};

function sameStr(a?: string | null, b?: string | null) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

export default function CardForm() {
  const [step, setStep] = React.useState<StepId>(1);

  // Dados (mesmos campos, só reorganizados em 5 telas)
  const [pfChoice, setPfChoice] = React.useState<"me" | "family" | "">("");
  const [modality, setModality] = React.useState<Modality | "">("");
  const [ageCounts, setAgeCounts] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(AGE_BUCKETS.map((b) => [b.key, 0])),
  );

  const [uf, setUf] = React.useState("");
  const [city, setCity] = React.useState("");

  const [profession, setProfession] = React.useState("");

  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const [leadId, setLeadId] = React.useState<string | null>(null);

  // Refs (apenas UX)
  const ageTopRef = React.useRef<HTMLDivElement | null>(null);
  const nameRef = React.useRef<HTMLInputElement | null>(null);
  const phoneRef = React.useRef<HTMLInputElement | null>(null);

  // Cities
  const [citiesForUf, setCitiesForUf] = React.useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = React.useState(false);
  const [citiesError, setCitiesError] = React.useState<string | null>(null);

  // submit
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  // Saving lead mid-flow (na etapa 3)
  const [savingLead, setSavingLead] = React.useState(false);

  const isCompany = modality === "PJ" || modality === "MEI";
  const isMei = modality === "MEI";

  const totalPeople = React.useMemo(
    () => Object.values(ageCounts).reduce((a, b) => a + b, 0),
    [ageCounts],
  );

  const minPeople =
    modality === "PF" ? 1 : modality === "PJ" || modality === "MEI" ? 2 : 1;

  const idadesString = React.useMemo(
    () => buildIdadesString(ageCounts),
    [ageCounts],
  );

  React.useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function run() {
      const nextUf = uf?.trim().toUpperCase();
      if (!nextUf) {
        setCitiesForUf([]);
        setCitiesLoading(false);
        setCitiesError(null);
        return;
      }

      setCitiesLoading(true);
      setCitiesError(null);

      try {
        const cities = await fetchCitiesByUF(nextUf, controller.signal);
        if (!mounted) return;
        setCitiesForUf(cities);
      } catch (err: any) {
        if (!mounted) return;
        if (err?.name === "AbortError") return;
        setCitiesForUf([]);
        setCitiesError(
          "Não foi possível carregar as cidades. Tente novamente.",
        );
      } finally {
        if (!mounted) return;
        setCitiesLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [uf]);

  const citiesToShow = React.useMemo(() => {
    if (!uf || citiesLoading) return [];
    if (citiesForUf.length) return citiesForUf;
    return FALLBACK_CITIES;
  }, [uf, citiesLoading, citiesForUf]);

  function ownerParams() {
    return new URLSearchParams({
      firebaseUid: OWNER_FIREBASE_UID,
      email: OWNER_EMAIL,
      name: OWNER_NAME,
    });
  }

  async function fetchAllLeads(): Promise<LeadFromApi[]> {
    const res = await fetch(`/api/leads?${ownerParams().toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data?.error || "Erro ao carregar leads para conferência.",
      );
    }

    const payload = (await res.json().catch(() => [])) as LeadFromApi[];
    if (!Array.isArray(payload)) return [];
    return payload;
  }

  async function resolveCreatedLeadId(): Promise<string> {
    const desiredNome = "Lead (pré-cadastro)";
    const desiredCidade = city.trim();
    const desiredEstado = uf.trim().toUpperCase();
    const desiredOrigem = mapOrigem();

    const leads = await fetchAllLeads();

    const found =
      leads.find((l) => {
        return (
          sameStr(l.nome, desiredNome) &&
          sameStr(l.cidade, desiredCidade) &&
          sameStr(l.estado, desiredEstado) &&
          sameStr(l.origem, desiredOrigem)
        );
      }) ?? null;

    if (found?.id) return String(found.id);

    // fallback: tenta achar pelo mais recente com mesma cidade/estado/origem
    const byPlace = leads.find(
      (l) =>
        sameStr(l.cidade, desiredCidade) &&
        sameStr(l.estado, desiredEstado) &&
        sameStr(l.origem, desiredOrigem),
    );
    if (byPlace?.id) return String(byPlace.id);

    throw new Error(
      "Criei o lead, mas não consegui localizar o ID. Tente novamente.",
    );
  }

  async function createLeadWhenHasLocation(): Promise<string> {
    // OBS: seu POST exige qtd_vidas e idades (truthy), então mando placeholders
    // Nome/telefone reais entram no PUT final (Etapa 5)
    const body = {
      nome: "Lead (pré-cadastro)",
      telefone: null,
      origem: mapOrigem(),
      estado: uf.trim().toUpperCase(),
      cidade: city.trim(),

      // obrigatórios do POST
      qtd_vidas: 1,
      idades: "A definir",

      status: "Abordagem",
      possui_cnpj: null,
      tem_plano_anterior: null,
      operadora_anterior: null,
      tempo_plano_anterior: null,
      modalidade: null,
      operadora_ofertada: null,
      acomodacao: null,
      valor_mensalidade: null,
      coparticipacao: null,
      lote_producao_id: null,
      valor_comissao: null,
      data_venda: null,
      last_chamado_at: null,
    };

    const res = await fetch(`/api/leads?${ownerParams().toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Erro ao criar lead (Etapa 3)");
    }

    const id = await resolveCreatedLeadId();
    return id;
  }

  function back() {
    setSubmitError(null);
    if (submitted) return;
    setStep((s) => clamp(s - 1, 1, 5) as StepId);
  }

  async function next() {
    setSubmitError(null);
    if (submitted) return;

    if (step === 1) {
      if (!modality) {
        setSubmitError("Selecione uma opção para continuar.");
        return;
      }
      setStep(2);
      // scroll mental: como print
      setTimeout(
        () => ageTopRef.current?.scrollIntoView({ block: "start" }),
        50,
      );
      return;
    }

    if (step === 2) {
      if (!modality) {
        setSubmitError("Selecione uma opção na etapa anterior.");
        return;
      }
      if (totalPeople < minPeople || idadesString.length === 0) {
        setSubmitError(
          `Informe as idades (mínimo: ${minPeople} pessoa${minPeople > 1 ? "s" : ""}).`,
        );
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!uf) {
        setSubmitError("Escolha seu estado (UF).");
        return;
      }
      if (!city) {
        setSubmitError("Escolha sua cidade.");
        return;
      }

      // cria o lead aqui (primeiro momento que temos localidade)
      try {
        setSavingLead(true);
        const id = leadId ?? (await createLeadWhenHasLocation());
        if (!leadId) setLeadId(id);
        setStep(4);
      } catch (e: any) {
        setSubmitError(e?.message || "Erro ao salvar a Etapa 3.");
      } finally {
        setSavingLead(false);
      }
      return;
    }

    if (step === 4) {
      if (!profession) {
        setSubmitError("Selecione sua profissão para continuar.");
        return;
      }
      setStep(5);
      setTimeout(() => nameRef.current?.focus(), 150);
      return;
    }
  }

  async function handleSubmit() {
    if (!leadId) {
      setSubmitError(
        "Não foi possível identificar o lead. Volte e tente novamente.",
      );
      setStep(3);
      return;
    }

    if (submitting) return;

    // validação final (sem campo novo)
    if (fullName.trim().length < 3) {
      setSubmitError("Por favor, digite seu nome completo.");
      nameRef.current?.focus();
      return;
    }
    if (onlyDigits(phone).length < 10) {
      setSubmitError("Digite seu WhatsApp com DDD (ex: 41 99999-9999).");
      phoneRef.current?.focus();
      return;
    }
    if (!modality || !profession) {
      setSubmitError("Preencha as etapas anteriores.");
      return;
    }
    if (totalPeople < minPeople || idadesString.length === 0) {
      setSubmitError("Informe as idades corretamente.");
      setStep(2);
      return;
    }
    if (!uf || !city) {
      setSubmitError("Informe sua cidade/estado.");
      setStep(3);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const body = {
        id: leadId,

        nome: fullName.trim(),
        telefone: onlyDigits(phone) || null,
        origem: mapOrigem(),
        estado: uf.trim().toUpperCase(),
        cidade: city.trim(),

        qtd_vidas: totalPeople,
        idades: idadesString,

        possui_cnpj: modality === "PJ" || modality === "MEI",
        modalidade: modality || null,

        tem_plano_anterior: null,
        operadora_anterior: null,
        tempo_plano_anterior: null,
        operadora_ofertada: null,
        acomodacao: null,
        valor_mensalidade: null,
        coparticipacao: null,
        valor_comissao: null,
        data_venda: null,
        last_chamado_at: null,
      };

      const res = await fetch(`/api/leads/update?${ownerParams().toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao enviar. Tente novamente.");
      }

      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e?.message || "Falha ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  // UI helpers
  const OperatorRow = () => (
    <div className="mt-8 pt-5 border-t">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground/70" />
        Buscando as melhores opções...
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 opacity-60">
        <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
          <Heart className="h-5 w-5" />
          SulAmérica
        </div>
        <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-5 w-5" />
          Unimed
        </div>
        <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
          <Stethoscope className="h-5 w-5" />
          Amil
        </div>
        <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
          <Building2 className="h-5 w-5" />
          Porto
        </div>
      </div>
    </div>
  );

  // Fundo bem leve (limpo / feminino / 40+)
  const Background = () => (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden
      style={{
        background:
          "radial-gradient(circle at 20% 10%, rgba(16,185,129,0.12), transparent 40%), radial-gradient(circle at 90% 20%, rgba(34,197,94,0.10), transparent 45%), linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,1))",
      }}
    />
  );

  return (
    <div className="w-full">
      <Background />

      <Card className="mx-auto my-6 max-w-[560px] rounded-3xl border border-emerald-200/50 bg-background/70 backdrop-blur shadow-[0_14px_40px_-28px_rgba(16,185,129,0.55)]">
        <CardContent className="p-6">
          {/* topo: voltar */}
          {!submitted && step !== 1 && (
            <div className="mb-3">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={back}
                className="hover:bg-emerald-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          )}

          {/* SUCESSO */}
          {submitted && (
            <div className="space-y-6 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl border border-emerald-200/60 flex items-center justify-center bg-emerald-50/60 shadow-sm">
                <PartyPopper className="h-7 w-7 text-emerald-700" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold">
                  Pronto, {firstName(fullName) || "tudo certo"}! 🎉
                </h1>
                <p className="text-sm text-muted-foreground">
                  Recebemos seus dados e já colocamos na fila de atendimento.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-5 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Próximo passo
                    </div>
                    <div className="text-lg font-semibold">
                      Um corretor vai te chamar em até{" "}
                      <span className="underline decoration-emerald-400/60">
                        15 minutos
                      </span>
                    </div>
                  </div>
                  <Badge className="rounded-full bg-emerald-600 text-white hover:bg-emerald-600">
                    Em andamento
                  </Badge>
                </div>

                <Separator className="my-4" />

                <div className="grid gap-3 text-sm">
                  <div className="rounded-xl border border-emerald-200/50 bg-background p-3">
                    <div className="text-muted-foreground">WhatsApp</div>
                    <div className="font-medium">{phone}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200/50 bg-background p-3">
                    <div className="text-muted-foreground">Cidade</div>
                    <div className="font-medium">
                      {city} - {uf}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-200/50 bg-background p-3">
                    <div className="text-muted-foreground">Modalidade</div>
                    <div className="font-medium">{modality}</div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Ao enviar, você autoriza contato por WhatsApp/telefone.
              </div>

              <Button
                className="w-full h-12 rounded-2xl text-base"
                onClick={() => window.location.reload()}
                variant="secondary"
              >
                Fazer outra simulação
              </Button>
            </div>
          )}

          {/* ETAPAS */}
          {!submitted && (
            <div className="space-y-4">
              <StepHeader step={step} />

              {/* erro */}
              {submitError && (
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-900">
                  {submitError}
                </div>
              )}

              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl font-semibold">
                      Para quem é o plano de saúde?
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Selecione a opção que melhor descreve sua necessidade
                    </p>
                  </div>

                  <div className="space-y-3">
                    <OptionCard
                      title="Para Mim"
                      subtitle="Plano individual ou por adesão"
                      icon={<User className="h-4 w-4 text-emerald-700" />}
                      selected={modality === "PF" && pfChoice === "me"}
                      onClick={() => {
                        setModality("PF");
                        setPfChoice("me");
                      }}
                    />

                    <OptionCard
                      title="Para Minha Família"
                      subtitle="Plano familiar com dependentes"
                      icon={<Users className="h-4 w-4 text-emerald-700" />}
                      selected={modality === "PF" && pfChoice === "family"}
                      onClick={() => {
                        setModality("PF");
                        setPfChoice("family");
                      }}
                    />

                    <OptionCard
                      title="Para Minha Empresa"
                      subtitle="Plano empresarial ou PME"
                      icon={<Building2 className="h-4 w-4 text-emerald-700" />}
                      selected={isCompany}
                      onClick={() => {
                        setModality("PJ");
                        setPfChoice(""); // limpa seleção PF
                      }}
                    />

                    {isCompany && (
                      <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-emerald-950">
                            Sua empresa é{" "}
                            <span className="font-semibold">MEI</span>?
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={isMei ? "default" : "outline"}
                              className={cn(
                                "rounded-2xl",
                                isMei && "bg-emerald-600 hover:bg-emerald-600",
                              )}
                              onClick={() => setModality("MEI")}
                            >
                              Sim
                            </Button>

                            <Button
                              type="button"
                              variant={!isMei ? "default" : "outline"}
                              className={cn(
                                "rounded-2xl",
                                !isMei && "bg-emerald-600 hover:bg-emerald-600",
                              )}
                              onClick={() => setModality("PJ")}
                            >
                              Não
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    className={CTA}
                    onClick={next}
                    disabled={
                      !modality || (modality === "PF" && !pfChoice) // exige escolher “Mim” ou “Família”
                    }
                  >
                    Continuar <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <OperatorRow />
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-5" ref={ageTopRef}>
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-semibold">
                      Quantas pessoas e idades?
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Isso nos ajuda a encontrar as melhores opções para você
                    </p>
                  </div>

                  {/* mantém exatamente seu coletor de idades */}
                  <Card className="rounded-3xl border border-emerald-200/50 bg-background/70">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground tabular-nums">
                            {totalPeople}
                          </span>{" "}
                          pessoa{totalPeople === 1 ? "" : "s"}
                        </div>
                        <Badge
                          variant="outline"
                          className="rounded-full border-emerald-200/70 bg-emerald-50/60"
                        >
                          mínimo: {minPeople}
                        </Badge>
                      </div>

                      <div className="divide-y">
                        {AGE_BUCKETS.map((b) => (
                          <CounterRow
                            key={b.key}
                            label={b.label}
                            value={ageCounts[b.key]}
                            onChange={(nextVal) =>
                              setAgeCounts((prev) => ({
                                ...prev,
                                [b.key]: nextVal,
                              }))
                            }
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {totalPeople > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Resumo idades:
                      </span>{" "}
                      {idadesString || "—"}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 rounded-2xl"
                      onClick={back}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                    <Button
                      className={cn(CTA, "h-14")}
                      onClick={next}
                      disabled={
                        totalPeople < minPeople || idadesString.length === 0
                      }
                    >
                      Continuar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  <OperatorRow />
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-semibold">Onde você mora?</h1>
                    <p className="text-sm text-muted-foreground">
                      Informe a cidade onde deseja ter atendimento
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Estado</Label>
                      <SelectField
                        icon={
                          <MapPin className="h-4 w-4 text-emerald-700/70" />
                        }
                        placeholder="Selecione seu estado (UF)"
                        value={uf}
                        onValueChange={(nextUf) => {
                          setUf(nextUf);
                          setCity("");
                        }}
                      >
                        {UF.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectField>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Cidade</Label>
                      <SelectField
                        icon={
                          <MapPin className="h-4 w-4 text-emerald-700/70" />
                        }
                        placeholder={
                          !uf
                            ? "Escolha o estado"
                            : citiesLoading
                              ? "Carregando..."
                              : "Selecione sua cidade"
                        }
                        value={city}
                        onValueChange={setCity}
                        disabled={!uf || citiesLoading}
                      >
                        {citiesLoading ? (
                          <SelectItem value="__loading" disabled>
                            Carregando...
                          </SelectItem>
                        ) : citiesError ? (
                          <>
                            <SelectItem value="__error" disabled>
                              {citiesError}
                            </SelectItem>
                            {FALLBACK_CITIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </>
                        ) : (
                          (citiesToShow.length
                            ? citiesToShow
                            : FALLBACK_CITIES
                          ).map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectField>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 rounded-2xl"
                      onClick={back}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                    <Button
                      className={cn(CTA, "h-14")}
                      onClick={next}
                      disabled={!uf || !city || savingLead}
                    >
                      {savingLead ? "Salvando..." : "Continuar"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  <OperatorRow />
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-semibold">
                      Qual sua profissão?
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Isso nos ajuda a encontrar planos mais em conta
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Profissão</Label>
                    <SelectField
                      icon={
                        <BriefcaseBusiness className="h-4 w-4 text-emerald-700/70" />
                      }
                      placeholder="Selecione"
                      value={profession}
                      onValueChange={setProfession}
                    >
                      {PROFESSIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectField>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 rounded-2xl"
                      onClick={back}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                    <Button
                      className={cn(CTA, "h-14")}
                      onClick={next}
                      disabled={!profession}
                    >
                      Continuar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-700/80" />
                    Seus dados são usados apenas para atendimento.
                  </div>

                  <OperatorRow />
                </div>
              )}

              {/* STEP 5 */}
              {step === 5 && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <BrandPill className="mx-auto">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      Ótimas notícias!
                    </BrandPill>

                    <h1 className="text-2xl font-semibold">
                      Encontramos oportunidades para{" "}
                      <span className="text-emerald-700">
                        {city || "sua cidade"}
                      </span>
                      !
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Confira o resumo e finalize para receber sua cotação
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      Resumo da sua cotação
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Confira seus dados antes de continuar
                    </div>

                    <Separator className="my-3" />

                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-emerald-700/80" />
                        <div>
                          <div className="font-medium">
                            {modality === "PF"
                              ? "Individual / Família"
                              : modality === "MEI"
                                ? "MEI"
                                : "Empresa"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {idadesString || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-700/80" />
                        <div>
                          <div className="font-medium">{city}</div>
                          <div className="text-xs text-muted-foreground">
                            Estado: {uf}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <BriefcaseBusiness className="h-4 w-4 text-emerald-700/80" />
                        <div>
                          <div className="font-medium">{profession}</div>
                          <div className="text-xs text-muted-foreground">
                            Perfil informado
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nome */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Nome Completo
                    </Label>
                    <Input
                      ref={nameRef}
                      id="name"
                      placeholder="Digite seu nome completo"
                      className={cn(
                        "h-14 rounded-2xl bg-background/80 text-base",
                        "focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:border-emerald-300",
                      )}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>

                  {/* Whats */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      WhatsApp
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">
                        <MessageCircle className="h-4 w-4 text-emerald-700/70" />
                      </span>
                      <Input
                        ref={phoneRef}
                        id="phone"
                        placeholder="(00) 00000-0000"
                        className={cn(
                          "pl-10 h-14 rounded-2xl bg-background/80 text-base",
                          "focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:border-emerald-300",
                        )}
                        value={phone}
                        onChange={(e) =>
                          setPhone(formatPhoneBR(e.target.value))
                        }
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Ao prosseguir, você concorda em receber contato via
                      WhatsApp para sua cotação.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 rounded-2xl"
                      onClick={back}
                      disabled={submitting}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                    <Button
                      className={cn(
                        CTA,
                        "h-14 bg-emerald-600 text-white hover:bg-emerald-600",
                      )}
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? "Enviando..." : "Receber Minha Cotação"}
                      <Rocket className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  <OperatorRow />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
