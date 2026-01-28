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

type StepId = 1 | 2;
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
  variant = "soft",
  className,
}: {
  children: React.ReactNode;
  variant?: "soft" | "solid" | "outline";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
  const styles =
    variant === "solid"
      ? "bg-emerald-600 text-white shadow-sm"
      : variant === "outline"
        ? "border border-emerald-200/70 bg-background/60 text-foreground"
        : "bg-emerald-50/70 text-emerald-800 border border-emerald-200/70";
  return <div className={cn(base, styles, className)}>{children}</div>;
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

function ModalityCard({
  value,
  selected,
  title,
  subtitle,
  badge,
  icon,
  onSelect,
}: {
  value: Modality;
  selected: boolean;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  onSelect: (v: Modality) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "w-full text-left rounded-2xl border p-5 transition-all relative overflow-hidden",
        selected
          ? "border-emerald-300 bg-emerald-50/60 shadow-sm"
          : "border-border hover:bg-emerald-50/30 hover:border-emerald-200/70 hover:shadow-sm",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -inset-10 opacity-0 transition",
          selected && "opacity-100",
        )}
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(16,185,129,0.22), transparent 55%)",
        }}
      />
      <div className="relative flex items-start justify-between gap-4">
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
          <div>
            <div className="text-base font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
          </div>
        </div>

        <Badge
          className={cn(
            "rounded-full",
            selected
              ? "bg-emerald-600 text-white hover:bg-emerald-600"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200/70 hover:bg-emerald-50",
          )}
        >
          {badge}
        </Badge>
      </div>
    </button>
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

function Field({
  id,
  icon,
  placeholder,
  value,
  onChange,
  inputMode,
  autoComplete,
}: {
  id: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
      <Input
        id={id}
        placeholder={placeholder}
        className={cn(
          "pl-10 h-12 rounded-2xl bg-background/80 text-base",
          "focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:border-emerald-300",
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        autoComplete={autoComplete}
      />
    </div>
  );
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
          "h-12 rounded-2xl bg-background/80 text-base",
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
  "w-full h-12 rounded-2xl text-base bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-600 hover:to-emerald-500 shadow-[0_12px_30px_-18px_rgba(16,185,129,0.85)] disabled:opacity-60 disabled:shadow-none";

function StepProgress({
  step,
  submitted,
}: {
  step: StepId;
  submitted: boolean;
}) {
  const current = submitted ? 2 : step;
  const percent = current === 1 ? 50 : 100;

  return (
    <div className="mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BrandPill variant="soft" className="hidden sm:inline-flex">
              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              Rápido e simples
            </BrandPill>
          </div>

          <div className="text-xs text-muted-foreground">
            Leva menos de 1 minuto. Sem complicação.
          </div>
        </div>

        <div className="sm:hidden">
          <BrandPill variant="outline">
            <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
            {current}/2
          </BrandPill>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-3 w-full rounded-full bg-emerald-100/70 border border-emerald-200/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-600 transition-[width] duration-300"
            style={{ width: `${percent}%` }}
            aria-label={`Progresso: ${percent}%`}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-7 w-7 rounded-full border flex items-center justify-center",
                current >= 1
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-border bg-background",
              )}
              aria-hidden
            >
              {current > 1 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              ) : (
                <span className="text-emerald-700 font-semibold">1</span>
              )}
            </div>
            <span
              className={cn(
                current >= 1 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Dados básicos
            </span>
          </div>

          <div className="h-px flex-1 mx-3 bg-emerald-200/70" aria-hidden />

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-7 w-7 rounded-full border flex items-center justify-center",
                current >= 2
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-border bg-background",
              )}
              aria-hidden
            >
              {current >= 2 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              ) : (
                <span className="text-muted-foreground font-semibold">2</span>
              )}
            </div>
            <span
              className={cn(
                current >= 2 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Perfil
            </span>
          </div>
        </div>
      </div>
    </div>
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

  // Step 1
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [city, setCity] = React.useState("");
  const [uf, setUf] = React.useState("");
  const [leadId, setLeadId] = React.useState<string | null>(null);

  // UX (mais “mobile + 40+”)
  const nameRef = React.useRef<HTMLInputElement | null>(null);
  const phoneRef = React.useRef<HTMLInputElement | null>(null);

  // Cities
  const [citiesForUf, setCitiesForUf] = React.useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = React.useState(false);
  const [citiesError, setCitiesError] = React.useState<string | null>(null);

  // Step 2
  const [modality, setModality] = React.useState<Modality | "">("");
  const [profession, setProfession] = React.useState("");
  const [ageCounts, setAgeCounts] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(AGE_BUCKETS.map((b) => [b.key, 0])),
  );

  // submit
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  // UX: feedback “salvando…”
  const [savingStep1, setSavingStep1] = React.useState(false);

  const totalPeople = React.useMemo(
    () => Object.values(ageCounts).reduce((a, b) => a + b, 0),
    [ageCounts],
  );

  const minPeople =
    modality === "PF" ? 1 : modality === "PJ" || modality === "MEI" ? 2 : 1;

  // Focus inicial (bom pra mobile)
  React.useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // Focus quando muda step
  React.useEffect(() => {
    if (step === 1) {
      const t = setTimeout(() => nameRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [step]);

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
        setCitiesError("Não foi possível carregar as cidades. Tente novamente.");
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

  const canGoNextStep1 =
    fullName.trim().length >= 3 &&
    onlyDigits(phone).length >= 10 &&
    !!uf &&
    !!city;

  const idadesString = React.useMemo(
    () => buildIdadesString(ageCounts),
    [ageCounts],
  );

  const canFinalize =
    !!modality &&
    !!profession &&
    totalPeople >= (modality ? minPeople : 1) &&
    idadesString.length > 0;

  function back() {
    setSubmitError(null);
    if (submitted) return;
    if (step === 2) setStep(1);
  }

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
      throw new Error(data?.error || "Erro ao carregar leads para conferência.");
    }

    const payload = (await res.json().catch(() => [])) as LeadFromApi[];
    if (!Array.isArray(payload)) return [];
    return payload;
  }

  async function resolveCreatedLeadId(): Promise<string> {
    const desiredPhone = onlyDigits(phone);
    const desiredNome = fullName.trim();
    const desiredCidade = city.trim();
    const desiredEstado = uf.trim().toUpperCase();
    const desiredOrigem = mapOrigem();

    const leads = await fetchAllLeads();

    const found =
      leads.find((l) => {
        const apiPhone = onlyDigits(l.telefone ?? "");
        return (
          sameStr(l.nome, desiredNome) &&
          sameStr(l.cidade, desiredCidade) &&
          sameStr(l.estado, desiredEstado) &&
          sameStr(l.origem, desiredOrigem) &&
          (!!desiredPhone ? apiPhone === desiredPhone : true)
        );
      }) ?? null;

    if (found?.id) return String(found.id);

    if (desiredPhone) {
      const byPhone = leads.find((l) => {
        const apiPhone = onlyDigits(l.telefone ?? "");
        return apiPhone === desiredPhone;
      });
      if (byPhone?.id) return String(byPhone.id);
    }

    throw new Error("Criei o lead, mas não consegui localizar o ID. Tente novamente.");
  }

  async function createLeadFromStep1(): Promise<string> {
    // OBS: seu POST exige qtd_vidas e idades (truthy), então mando placeholders
    const body = {
      nome: fullName.trim(),
      telefone: onlyDigits(phone) || null,
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
      throw new Error(data?.error || "Erro ao criar lead (Etapa 1)");
    }

    // seu POST retorna { success: true }, então resolvemos o ID via GET
    const id = await resolveCreatedLeadId();
    return id;
  }

  async function next() {
    setSubmitError(null);
    if (step !== 1) return;

    // pequenos “nudges” bem diretos (40+ gosta de clareza)
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
    if (!uf) {
      setSubmitError("Escolha seu estado (UF).");
      return;
    }
    if (!city) {
      setSubmitError("Escolha sua cidade.");
      return;
    }

    if (!canGoNextStep1) return;

    try {
      setSavingStep1(true);

      // se já criou (ex: usuário voltou pro step 1), não cria de novo
      const id = leadId ?? (await createLeadFromStep1());
      if (!leadId) setLeadId(id);

      setStep(2);
      setSubmitError(null);
    } catch (e: any) {
      setSubmitError(e?.message || "Erro ao salvar a Etapa 1.");
    } finally {
      setSavingStep1(false);
    }
  }

  async function handleSubmit() {
    if (!leadId) {
      setSubmitError("Não foi possível identificar o lead. Volte e tente novamente.");
      return;
    }
    if (!canFinalize || submitting) return;

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

  return (
    <div className="w-full">
      {/* Fundo bem leve (limpo / feminino / 40+) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(16,185,129,0.12), transparent 40%), radial-gradient(circle at 90% 20%, rgba(34,197,94,0.10), transparent 45%), linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,1))",
        }}
      />

      <Card className="mx-auto my-6 max-w-[520px] rounded-3xl border border-emerald-200/50 bg-background/70 backdrop-blur shadow-[0_14px_40px_-28px_rgba(16,185,129,0.55)]">
        <CardContent className="p-6">
          {/* Header mais humano e simples */}
          <div className="mb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  Simulação rápida de plano de saúde
                </div>
                <div className="text-xl font-semibold leading-tight">
                  Saiba qual plano é ideal para você em 2 clicks
                </div>
              </div>


            </div>

            <div className="mt-4">
              <StepProgress step={step} submitted={submitted} />
            </div>
          </div>

          {/* Botão voltar */}
          {!submitted && step !== 1 && (
            <div className="mb-4">
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

          {/* STEP 1 */}
          {!submitted && step === 1 && (
            <div className="space-y-5">

              <div className="space-y-4">
                <Label htmlFor="name" className="sr-only">
                  Nome completo
                </Label>
                <Input
                  ref={nameRef}
                  id="name"
                  placeholder="Seu nome completo"
                  className={cn(
                    "h-12 rounded-2xl bg-background/80 text-base",
                    "focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:border-emerald-300",
                  )}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />

                <Label htmlFor="phone" className="sr-only">
                  WhatsApp
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Phone className="h-4 w-4 text-emerald-700/70" />
                  </span>
                  <Input
                    ref={phoneRef}
                    id="phone"
                    placeholder="WhatsApp com DDD (ex: 41 99999-9999)"
                    className={cn(
                      "pl-10 h-12 rounded-2xl bg-background/80 text-base",
                      "focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:border-emerald-300",
                    )}
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="sr-only">Estado</Label>
                    <SelectField
                      icon={<MapPin className="h-4 w-4 text-emerald-700/70" />}
                      placeholder="Estado (UF)"
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
                    <Label className="sr-only">Cidade</Label>
                    <SelectField
                      icon={<MapPin className="h-4 w-4 text-emerald-700/70" />}
                      placeholder={
                        !uf
                          ? "Escolha o estado"
                          : citiesLoading
                            ? "Carregando..."
                            : "Cidade"
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
                        (citiesToShow.length ? citiesToShow : FALLBACK_CITIES).map(
                          (c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ),
                        )
                      )}
                    </SelectField>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-900">
                  {submitError}
                </div>
              )}

              <Button
                className={CTA}
                onClick={next}
                disabled={!canGoNextStep1 || savingStep1}
              >
                {savingStep1 ? "Salvando..." : "Continuar"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-700/80" />
                Seus dados são usados apenas para atendimento.
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {!submitted && step === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/45 p-4 text-sm">
                <div className="font-medium flex items-center gap-2 text-emerald-900">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  Só mais 2 perguntas
                </div>
                <div className="text-muted-foreground mt-1">
                  Assim a gente já te indica a opção mais adequada.
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Qual modalidade você quer?</div>

                <div className="space-y-3">
                  <ModalityCard
                    value="PF"
                    selected={modality === "PF"}
                    title="Pessoa Física"
                    subtitle="Pra você e sua família."
                    badge="Mín. 1 pessoa"
                    icon={<User className="h-4 w-4 text-emerald-700" />}
                    onSelect={setModality}
                  />
                  <ModalityCard
                    value="PJ"
                    selected={modality === "PJ"}
                    title="Pessoa Jurídica"
                    subtitle="Para empresa (CNPJ ativo)."
                    badge="Mín. 2 pessoas"
                    icon={<Building2 className="h-4 w-4 text-emerald-700" />}
                    onSelect={setModality}
                  />
                  <ModalityCard
                    value="MEI"
                    selected={modality === "MEI"}
                    title="MEI"
                    subtitle="MEI com CNPJ ativo (regras variam)."
                    badge="Mín. 2 pessoas"
                    icon={<BriefcaseBusiness className="h-4 w-4 text-emerald-700" />}
                    onSelect={setModality}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sua profissão</Label>
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

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Quantas pessoas e idades
                  </Label>

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

                  <div
                    className={cn(
                      "rounded-2xl border p-3 text-sm flex items-start gap-2",
                      totalPeople >= minPeople
                        ? "border-emerald-200/70 bg-emerald-50/60 text-muted-foreground"
                        : "border-amber-300/60 bg-amber-50/50 text-muted-foreground",
                    )}
                  >
                    <div className="mt-0.5">⚡</div>
                    <div>
                      {totalPeople >= minPeople ? (
                        <>
                          Pronto!{" "}
                          <span className="font-medium text-foreground">
                            Você já pode finalizar
                          </span>
                          .
                        </>
                      ) : (
                        <>
                          Falta pouco: coloque no mínimo{" "}
                          <span className="font-semibold text-foreground">
                            {minPeople} pessoa{minPeople === 1 ? "" : "s"}
                          </span>{" "}
                          para essa modalidade.
                        </>
                      )}
                    </div>
                  </div>

                  {totalPeople > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Resumo idades:
                      </span>{" "}
                      {idadesString || "—"}
                    </div>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-900">
                  {submitError}
                </div>
              )}

              <Button
                className={CTA}
                onClick={handleSubmit}
                disabled={!canFinalize || submitting}
              >
                {submitting ? "Enviando..." : "Finalizar e pedir atendimento"}
                <Rocket className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Ao finalizar, um corretor entra em contato no WhatsApp.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
