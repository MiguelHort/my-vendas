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
  Lock,
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

function claritySet(key: string, value: string) {
  if (typeof window === "undefined") return;
  const c = (window as any).clarity;
  if (typeof c === "function") c("set", key, value);
}

function clarityEvent(name: string) {
  claritySet(`evt_${name}`, String(Date.now()));
}

type StepId = 1 | 2 | 3 | 4;
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
    <div className="flex items-center justify-between py-3 px-3">
      <div className="text-sm text-blue-800">{label}</div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full",
            "border-white/20 bg-blue-800 text-white hover:bg-blue-900 hover:text-white",
          )}
          onClick={() => onChange(clamp(value - 1, 0, 99))}
          aria-label={`Diminuir ${label}`}
        >
          –
        </Button>
        <div className="w-7 text-center text-sm font-semibold tabular-nums text-blue-800">
          {value}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full",
            "border-white/20 bg-blue-800 text-white hover:bg-blue-900 hover:text-white",
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
          ? "border-orange-400/60 bg-orange-500 shadow-sm"
          : "border-white/15 bg-white hover:bg-white/80 hover:border-white/25",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 h-10 w-10 rounded-xl border flex items-center justify-center shadow-sm",
              selected
                ? "border-orange-400/50 bg-orange-500/10"
                : "border-white/15 bg-gray-200",
            )}
            aria-hidden
          >
            <span
              className={cn("text-orange-500", selected ? "text-white" : "")}
            >
              {icon}
            </span>
          </div>
          <div>
            <div
              className={cn(
                "text-base font-semibold text-blue-800",
                selected ? "text-white" : "",
              )}
            >
              {title}
            </div>
            <div
              className={cn(
                "text-sm text-blue-900 mt-1",
                selected ? "text-white/80" : "",
              )}
            >
              {subtitle}
            </div>
          </div>
        </div>

        <Badge
          className={cn(
            "rounded-full border",
            selected
              ? "bg-orange-500 text-white border-white hover:bg-orange-500"
              : "bg-orange-500/10 text-orange-500 border-orange-400/40 hover:bg-orange-500/10",
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
          "h-12 rounded-2xl bg-blue-900 text-white border border-white/20",
          "placeholder:text-white/60",
          "focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400",
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
  "w-full h-14 rounded-2xl text-base font-semibold bg-orange-500 text-white hover:bg-orange-600 shadow-lg disabled:opacity-60 disabled:shadow-none";

function StepProgress({
  step,
  submitted,
}: {
  step: StepId;
  submitted: boolean;
}) {
  const total = 4;
  const current = submitted ? total : step;
  const percent = Math.round((current / total) * 100);

  const labels: Record<StepId, string> = {
    1: "Modalidade",
    2: "Idades",
    3: "Cidade/UF",
    4: "Profissão",
  };

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>
          Etapa {current} de {total}
        </span>
        <span>{percent}%</span>
      </div>

      <div className="mt-2 h-2 w-full rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-500 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
          aria-label={`Progresso: ${percent}%`}
        />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
        {([1, 2, 3, 4] as StepId[]).map((s) => {
          const done = current > s;
          const active = current === s;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "h-7 w-7 shrink-0 rounded-full border flex items-center justify-center",
                  done || active
                    ? "border-orange-400/50 bg-orange-500/10"
                    : "border-white/20 bg-white/5",
                )}
                aria-hidden
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-orange-500" />
                ) : (
                  <span
                    className={cn(
                      "font-semibold",
                      active ? "text-orange-500" : "text-white/60",
                    )}
                  >
                    {s}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "truncate",
                  done || active ? "text-white" : "text-white/70",
                )}
                title={labels[s]}
              >
                {labels[s]}
              </span>
            </div>
          );
        })}
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

export default function CardForm() {
  const [step, setStep] = React.useState<StepId>(1);

  // Step 1 - modalidade
  const [modality, setModality] = React.useState<Modality | "">("");

  // Step 2 - idades
  const [ageCounts, setAgeCounts] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(AGE_BUCKETS.map((b) => [b.key, 0])),
  );

  // Step 3 - cidade e estado
  const [city, setCity] = React.useState("");
  const [uf, setUf] = React.useState("");

  // Step 4 - profissão (e dados de contato para finalizar)
  const [profession, setProfession] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  // UX refs
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

  const [started, setStarted] = React.useState(false);

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
    claritySet("FormStep", String(step));
    clarityEvent(`Step${step}Viewed`);
  }, [step]);

  React.useEffect(() => {
    function onBeforeUnload() {
      if (!submitted && started) {
        clarityEvent("FormAbandon");
        claritySet("FormAbandon", "true");
        claritySet("AbandonStep", String(step));
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [started, submitted, step]);

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

  function markStartOnce() {
    if (started) return;
    setStarted(true);
    clarityEvent("FormStart");
    claritySet("FormStarted", "true");
  }

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

  // ---- Validations per step ----
  const canGoStep1 = !!modality;

  const canGoStep2 =
    !!modality &&
    totalPeople >= (modality ? minPeople : 1) &&
    idadesString.length > 0;

  const canGoStep3 = !!uf && !!city;

  const canFinalize =
    !!profession &&
    fullName.trim().length >= 3 &&
    onlyDigits(phone).length >= 10 &&
    !!uf &&
    !!city &&
    !!modality &&
    idadesString.length > 0;

  function validateStepOrShowError(nextStep: StepId) {
    setSubmitError(null);

    // step 1 -> 2
    if (nextStep === 2) {
      if (!modality) {
        setSubmitError("Selecione uma modalidade.");
        return false;
      }
      return true;
    }

    // step 2 -> 3
    if (nextStep === 3) {
      if (!modality) {
        setSubmitError("Selecione uma modalidade.");
        return false;
      }
      if (totalPeople < minPeople) {
        setSubmitError(
          `Para ${modality}, informe no mínimo ${minPeople} pessoa${
            minPeople === 1 ? "" : "s"
          }.`,
        );
        return false;
      }
      if (!idadesString) {
        setSubmitError("Informe as idades (adicione pelo menos 1 pessoa).");
        return false;
      }
      return true;
    }

    // step 3 -> 4
    if (nextStep === 4) {
      if (!uf) {
        setSubmitError("Escolha seu estado (UF).");
        return false;
      }
      if (!city) {
        setSubmitError("Escolha sua cidade.");
        return false;
      }
      return true;
    }

    return true;
  }

  function back() {
    setSubmitError(null);
    if (submitted) return;
    setStep((s) => (s > 1 ? ((s - 1) as StepId) : s));
  }

  function next() {
    markStartOnce();

    if (submitted) return;

    if (step === 1) {
      if (!validateStepOrShowError(2)) return;
      if (!canGoStep1) return;
      clarityEvent("Step1ContinueClick");
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!validateStepOrShowError(3)) return;
      if (!canGoStep2) return;
      clarityEvent("Step2ContinueClick");
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!validateStepOrShowError(4)) return;
      if (!canGoStep3) return;
      clarityEvent("Step3ContinueClick");
      setStep(4);
      return;
    }
  }

  async function handleSubmit() {
    markStartOnce();

    if (step !== 4) return;
    setSubmitError(null);

    if (!profession) {
      setSubmitError("Selecione sua profissão.");
      return;
    }
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
    if (!canFinalize || submitting) return;

    setSubmitting(true);

    try {
      const body = {
        // Dados básicos
        nome: fullName.trim(),
        telefone: onlyDigits(phone) || null,
        origem: mapOrigem(),
        estado: uf.trim().toUpperCase(),
        cidade: city.trim(),

        // Perfil
        qtd_vidas: totalPeople,
        idades: idadesString,
        possui_cnpj: modality === "PJ" || modality === "MEI",
        modalidade: modality || null,

        // Mantidos
        status: "Abordagem",
        tem_plano_anterior: null,
        operadora_anterior: null,
        tempo_plano_anterior: null,
        operadora_ofertada: null,
        acomodacao: null,
        valor_mensalidade: null,
        coparticipacao: null,
        lote_producao_id: null,
        valor_comissao: null,
        data_venda: null,
        last_chamado_at: null,

        // Se existir no backend, descomente/mapeie:
        // profession: profession,
      };

      const res = await fetch(`/api/leads?${ownerParams().toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao enviar. Tente novamente.");
      }

      setSubmitted(true);
      clarityEvent("LeadSubmitted");
      claritySet("LeadSubmitted", "true");
    } catch (e: any) {
      setSubmitError(e?.message || "Falha ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full px-1">
      <Card className="mx-auto my-6 pb-0 max-w-[620px] rounded-3xl border border-white/15 bg-blue-900 backdrop-blur shadow-xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-6 text-center">
            <Badge className="mb-3 rounded-full bg-blue-900 text-white border border-white/20 px-4 py-1.5 text-[11px] backdrop-blur">
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
              Simulação Hapvida
            </Badge>

            <h2 className="text-2xl font-semibold text-white">
              Leva menos de 1 minuto
            </h2>

            <p className="mt-2 text-sm text-white/75">
              Preencha para receber as melhores opções para o seu perfil.
            </p>

            <div className="mt-5">
              <StepProgress step={step} submitted={submitted} />
            </div>
          </div>

          {/* Voltar */}
          {!submitted && step !== 1 && (
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={back}
                className="text-white hover:bg-blue-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
          )}

          {/* SUCESSO */}
          {submitted && (
            <div className="space-y-6 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-400/30">
                <PartyPopper className="h-8 w-8 text-orange-500" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-white">
                  Pronto, {firstName(fullName) || "tudo certo"}! 🎉
                </h1>
                <p className="text-sm text-white/75">
                  Recebemos seus dados e já colocamos na fila de atendimento.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-blue-900 p-5 text-left backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-white/70">Próximo passo</div>
                    <div className="text-lg font-semibold text-white">
                      Um corretor chama em até{" "}
                      <span className="text-orange-500">15 minutos</span>
                    </div>
                  </div>
                  <Badge className="rounded-full bg-orange-500 text-white hover:bg-orange-500">
                    Em andamento
                  </Badge>
                </div>

                <Separator className="my-4 bg-white/15" />

                <div className="grid gap-3 text-sm">
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <div className="text-white/70">WhatsApp</div>
                    <div className="font-medium text-white">{phone}</div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <div className="text-white/70">Cidade</div>
                    <div className="font-medium text-white">
                      {city} - {uf}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <div className="text-white/70">Modalidade</div>
                    <div className="font-medium text-white">{modality}</div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <div className="text-white/70">Profissão</div>
                    <div className="font-medium text-white">{profession}</div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-white/65">
                Ao enviar, você autoriza contato por WhatsApp/telefone.
              </div>

              <Button
                className="w-full h-12 rounded-2xl text-base bg-blue-900 text-white hover:bg-white/15 border border-white/15"
                onClick={() => window.location.reload()}
                variant="secondary"
              >
                Fazer outra simulação
              </Button>
            </div>
          )}

          {/* STEP 1 - Qual modalidade */}
          {!submitted && step === 1 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/15 bg-blue-900 p-4 text-sm backdrop-blur">
                <div className="font-medium flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Etapa 1 de 4
                </div>
                <div className="text-white/70 mt-1">
                  Primeiro, selecione a modalidade. Depois seguimos para as
                  idades e localização.
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-white">
                  Qual modalidade você quer?
                </div>

                <div className="space-y-3">
                  <ModalityCard
                    value="PF"
                    selected={modality === "PF"}
                    title="Pessoa Física"
                    subtitle="Pra você e sua família."
                    badge="Mín. 1 pessoa"
                    icon={<User className="h-4 w-4" />}
                    onSelect={(v) => {
                      markStartOnce();
                      clarityEvent("ModalitySelect");
                      setModality(v);
                    }}
                  />
                  <ModalityCard
                    value="PJ"
                    selected={modality === "PJ"}
                    title="Pessoa Jurídica"
                    subtitle="Para empresa (CNPJ ativo)."
                    badge="Mín. 2 pessoas"
                    icon={<Building2 className="h-4 w-4" />}
                    onSelect={(v) => {
                      markStartOnce();
                      clarityEvent("ModalitySelect");
                      setModality(v);
                    }}
                  />
                  <ModalityCard
                    value="MEI"
                    selected={modality === "MEI"}
                    title="MEI"
                    subtitle="MEI com CNPJ ativo (regras variam)."
                    badge="Mín. 2 pessoas"
                    icon={<BriefcaseBusiness className="h-4 w-4" />}
                    onSelect={(v) => {
                      markStartOnce();
                      clarityEvent("ModalitySelect");
                      setModality(v);
                    }}
                  />
                </div>
              </div>

              {submitError && (
                <div className="rounded-2xl border border-orange-400/40 bg-orange-500/10 p-4 text-sm text-white">
                  {submitError}
                </div>
              )}

              <Button
                className={CTA}
                onClick={() => {
                  clarityEvent("Step1ContinueClick");
                  next();
                }}
                disabled={!canGoStep1}
              >
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-white/70">
                <ShieldCheck className="h-4 w-4 text-orange-500" />
                Seus dados são usados apenas para atendimento.
              </div>
            </div>
          )}

          {/* STEP 2 - Idades */}
          {!submitted && step === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/15 bg-blue-900 p-4 text-sm backdrop-blur">
                <div className="font-medium flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Etapa 2 de 4
                </div>
                <div className="text-white/70 mt-1">
                  Agora informe quantas pessoas e as faixas de idade.
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-white">
                  Quantas pessoas e idades
                </Label>

                <Card className="rounded-3xl border border-white/15 bg-white backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-blue-800">
                        <span className="font-semibold text-white tabular-nums">
                          {totalPeople}
                        </span>{" "}
                        pessoa{totalPeople === 1 ? "" : "s"}
                      </div>
                      <Badge className="rounded-full bg-blue-900 text-white border border-white/20">
                        mínimo: {minPeople}
                      </Badge>
                    </div>

                    <div className="divide-y divide-blue-900">
                      {AGE_BUCKETS.map((b) => (
                        <CounterRow
                          key={b.key}
                          label={b.label}
                          value={ageCounts[b.key]}
                          onChange={(nextVal) => {
                            markStartOnce();
                            clarityEvent("AgeCounterChange");
                            setAgeCounts((prev) => ({
                              ...prev,
                              [b.key]: nextVal,
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div
                  className={cn(
                    "rounded-2xl border p-3 text-sm flex items-start gap-2 backdrop-blur",
                    totalPeople >= minPeople
                      ? "border-white/15 bg-blue-900 text-white/80"
                      : "border-orange-400/40 bg-orange-500/10 text-white/80",
                  )}
                >
                  <div className="mt-0.5 text-orange-500">⚡</div>
                  <div>
                    {totalPeople >= minPeople ? (
                      <>
                        Pronto!{" "}
                        <span className="font-semibold text-white">
                          Você já pode continuar
                        </span>
                        .
                      </>
                    ) : (
                      <>
                        Falta pouco: coloque no mínimo{" "}
                        <span className="font-semibold text-white">
                          {minPeople} pessoa{minPeople === 1 ? "" : "s"}
                        </span>{" "}
                        para essa modalidade.
                      </>
                    )}
                  </div>
                </div>

                {totalPeople > 0 && (
                  <div className="text-xs text-white/70">
                    <span className="font-medium text-white">
                      Resumo idades:
                    </span>{" "}
                    {idadesString || "—"}
                  </div>
                )}
              </div>

              {submitError && (
                <div className="rounded-2xl border border-orange-400/40 bg-orange-500/10 p-4 text-sm text-white">
                  {submitError}
                </div>
              )}

              <Button
                className={CTA}
                onClick={() => {
                  clarityEvent("Step2ContinueClick");
                  next();
                }}
                disabled={!canGoStep2}
              >
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <div className="rounded-2xl border border-white/15 bg-blue-900 p-4 text-sm backdrop-blur">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-400/30">
                    <Lock className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">
                      Seus dados ficam seguros
                    </div>
                    <div className="text-white/70">
                      Usamos apenas para enviar sua cotação e te atender no
                      WhatsApp.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 - Cidade e Estado */}
          {!submitted && step === 3 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/15 bg-blue-900 p-4 text-sm backdrop-blur">
                <div className="font-medium flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Etapa 3 de 4
                </div>
                <div className="text-white/70 mt-1">
                  Agora selecione seu estado e cidade.
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {/* Estado */}
                <div className="space-y-2">
                  <Label className="sr-only">Estado</Label>

                  <Select
                    value={uf}
                    onValueChange={(nextUf) => {
                      markStartOnce();
                      clarityEvent("UFFilled");
                      setUf(nextUf);
                      setCity("");
                    }}
                  >
                    <SelectTrigger className="bg-white text-blue-800">
                      <SelectValue placeholder="Estado (UF)" />
                    </SelectTrigger>

                    <SelectContent>
                      {UF.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cidade */}
                <div className="space-y-2">
                  <Label className="sr-only">Cidade</Label>

                  <Select
                    value={city}
                    onValueChange={(v) => {
                      markStartOnce();
                      clarityEvent("CityFilled");
                      setCity(v);
                    }}
                    disabled={!uf || citiesLoading}
                  >
                    <SelectTrigger className="bg-white text-blue-800">
                      <SelectValue
                        placeholder={
                          !uf
                            ? "Escolha o estado"
                            : citiesLoading
                              ? "Carregando..."
                              : "Cidade"
                        }
                      />
                    </SelectTrigger>

                    <SelectContent>
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {submitError && (
                <div className="rounded-2xl border border-orange-400/40 bg-orange-500/10 p-4 text-sm text-white">
                  {submitError}
                </div>
              )}

              <Button
                className={CTA}
                onClick={() => {
                  clarityEvent("Step3ContinueClick");
                  next();
                }}
                disabled={!canGoStep3}
              >
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-white/70 text-center">
                Usamos cidade/UF para filtrar a melhor rede e tabela.
              </p>
            </div>
          )}

          {/* STEP 4 - Sua profissão (e finalização) */}
          {!submitted && step === 4 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/15 bg-blue-900 p-4 text-sm backdrop-blur">
                <div className="font-medium flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Etapa 4 de 4
                </div>
                <div className="text-white/70 mt-1">
                  Só falta sua profissão e um contato pra receber atendimento.
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white">
                    Sua profissão
                  </Label>

                  <Select
                    value={profession}
                    onValueChange={(v) => {
                      markStartOnce();
                      clarityEvent("ProfessionSelect");
                      setProfession(v);
                    }}
                  >
                    <SelectTrigger className="bg-white text-blue-800">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>

                    <SelectContent>
                      {PROFESSIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-white/15" />

                <Label htmlFor="name" className="sr-only">
                  Nome completo
                </Label>
                <Input
                  ref={nameRef}
                  id="name"
                  placeholder="Seu nome completo"
                  className={cn(
                    "h-12 rounded-2xl bg-white text-blue-800 border border-white/20",
                    "placeholder:text-blue-800",
                    "focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:border-orange-400",
                  )}
                  value={fullName}
                  onFocus={() => {
                    markStartOnce();
                    clarityEvent("NameFocus");
                  }}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />

                <Label htmlFor="phone" className="sr-only">
                  WhatsApp
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Phone className="h-4 w-4 text-orange-500" />
                  </span>
                  <Input
                    ref={phoneRef}
                    id="phone"
                    placeholder="WhatsApp com DDD"
                    className={cn(
                      "pl-10 h-12 rounded-2xl bg-white text-blue-800 border border-white/20",
                      "placeholder:text-blue-800",
                      "focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:border-orange-400",
                    )}
                    value={phone}
                    onFocus={() => {
                      markStartOnce();
                      clarityEvent("PhoneFocus");
                      claritySet("PhoneFocused", "true");
                    }}
                    onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
              </div>

              {submitError && (
                <div className="rounded-2xl border border-orange-400/40 bg-orange-500/10 p-4 text-sm text-white">
                  {submitError}
                </div>
              )}

              <Button
                className={CTA}
                onClick={() => {
                  clarityEvent("Step4SubmitClick");
                  handleSubmit();
                }}
                disabled={!canFinalize || submitting}
              >
                {submitting ? "Enviando..." : "Finalizar e pedir atendimento"}
                <Rocket className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-white/70 text-center">
                Ao finalizar, um corretor entra em contato no WhatsApp.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
