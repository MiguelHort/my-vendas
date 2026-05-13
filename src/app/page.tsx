"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode, CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  Star,
  Shield,
  Globe,
  Sparkles,
  LayoutDashboard,
  TrendingUp,
  Clock,
  BarChart2,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Play,
  Filter,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { resetCookieConsent } from "@/components/CookieBanner";

/* ─── shared helpers ─────────────────────────────────────── */

function ManageCookiesLink() {
  return (
    <button
      onClick={resetCookieConsent}
      className="hover:text-gray-700 transition-colors"
    >
      Gerenciar cookies
    </button>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-medium text-gray-400 font-mono">
      <span className="inline-block w-6 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
      {children}
    </div>
  );
}

function GradientText({ children }: { children: ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
      {children}
    </span>
  );
}

function BentoCard({
  children,
  className = "",
  glowColor = "",
}: {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.05)] relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.09)] ${className}`}
    >
      {glowColor && (
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: glowColor, opacity: 0.07 }}
        />
      )}
      {children}
    </div>
  );
}

/* ─── mini-vis components ─────────────────────────────────── */

function PipelineMini() {
  const cols = [
    { c: "#059669", n: 4, label: "Novo" },
    { c: "#0ea5e9", n: 3, label: "Cotação" },
    { c: "#8b5cf6", n: 3, label: "Proposta" },
    { c: "#10b981", n: 2, label: "Fechado" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 mt-5">
      {cols.map((col) => (
        <div key={col.label} className="space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: col.c }}
            />
            <span className="font-mono truncate">{col.label}</span>
          </div>
          {Array.from({ length: col.n }).map((_, i) => (
            <div
              key={i}
              className="h-7 rounded-md border border-gray-200 bg-gray-50 overflow-hidden"
            >
              <div
                className="h-full w-[65%] rounded-l-md opacity-30"
                style={{
                  background: `linear-gradient(90deg, ${col.c}, transparent)`,
                }}
              />
            </div>
          ))}
        </div>
      ))}
      <div className="col-span-4 mt-1">
        <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
          Funil atualizado em tempo real
        </div>
      </div>
    </div>
  );
}

function MetricsMini() {
  return (
    <div className="mt-5 space-y-2.5">
      {[
        { label: "Taxa de conversão", value: "18%", bar: 72, c: "#059669" },
        { label: "Abordagens/dia", value: "34", bar: 58, c: "#0ea5e9" },
        { label: "Ticket médio mensal", value: "R$ 487", bar: 45, c: "#8b5cf6" },
      ].map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-gray-600 truncate">{r.label}</span>
              <span className="text-gray-900 font-medium font-mono">
                {r.value}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: r.bar + "%",
                  background: `linear-gradient(90deg, ${r.c}, ${r.c}88)`,
                }}
              />
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 mt-3 border-t border-gray-100 text-[12px]">
        <span className="text-gray-500">Performance do mês</span>
        <span className="font-semibold text-emerald-600">↗ +28%</span>
      </div>
    </div>
  );
}

function MapMini() {
  return (
    <div className="mt-5 space-y-2">
      {[
        { state: "SP", pct: 86, conv: "42% conv." },
        { state: "RJ", pct: 62, conv: "28% conv." },
        { state: "MG", pct: 44, conv: "19% conv." },
        { state: "PR", pct: 28, conv: "11% conv." },
      ].map((s) => (
        <div key={s.state} className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-semibold text-gray-500 w-6">
            {s.state}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
              style={{ width: s.pct + "%" }}
            />
          </div>
          <span className="text-[10px] text-gray-400 font-mono">{s.conv}</span>
        </div>
      ))}
      <div className="text-[10px] text-gray-400 font-mono mt-2">
        Baseado nas suas vendas registradas
      </div>
    </div>
  );
}

function FollowUpMini() {
  return (
    <div className="mt-5 space-y-2">
      {[
        {
          who: "Marina Lopes",
          status: "Avaliando proposta",
          tag: "Retornar hoje",
          urgent: true,
        },
        {
          who: "Tech Forge PME",
          status: "Cotação enviada · 45 vidas",
          tag: "3 dias",
          urgent: false,
        },
        {
          who: "Pedro Vianna",
          status: "Familiar · aguardando cônjuge",
          tag: "1 semana",
          urgent: false,
        },
      ].map((c) => (
        <div
          key={c.who}
          className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] font-medium text-gray-800 truncate">
              {c.who}
            </div>
            <div className="text-[10.5px] text-gray-500 truncate">
              {c.status}
            </div>
          </div>
          <span
            className={`ml-2 shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full ${
              c.urgent
                ? "bg-rose-50 text-rose-600 border border-rose-200"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {c.tag}
          </span>
        </div>
      ))}
      <div className="text-[10px] text-gray-400 font-mono mt-1">
        Nenhum lead cai no esquecimento
      </div>
    </div>
  );
}

function ProductionMini() {
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[11px] text-gray-500">Produção registrada hoje</div>
          <div className="text-[24px] font-semibold text-gray-900 tracking-tight">
            47 abordagens
          </div>
        </div>
        <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5">
          ↗ Meta atingida
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { n: "18", l: "Leads novos" },
          { n: "22", l: "Retrabalhos" },
          { n: "7", l: "Indicações" },
        ].map(({ n, l }) => (
          <div
            key={l}
            className="bg-gray-50 rounded-xl py-2.5 border border-gray-200"
          >
            <div className="text-[18px] font-semibold text-emerald-600">{n}</div>
            <div className="text-[9.5px] text-gray-500 leading-tight mt-0.5">
              {l}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10.5px] text-gray-400 font-mono">
        Separado por fonte de lead · atualizado ao longo do dia
      </div>
    </div>
  );
}

/* ─── page component ─────────────────────────────────────── */

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <WhatsAppFloat />

      {/* ── NAV ──────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 pt-4">
        <div className="mx-auto max-w-7xl">
          <div className="bg-white/90 backdrop-blur-xl border border-gray-200 shadow-sm flex items-center justify-between px-4 py-2.5 rounded-full">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/imgs/logo01.png"
                alt="WinLeads"
                width={108}
                height={28}
                unoptimized
                className="h-7 w-auto"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-[13px] text-gray-500">
              {[
                ["Como funciona", "#como-funciona"],
                ["Benefícios", "#beneficios"],
                ["Planos", "#planos"],
                ["Dúvidas", "#faq"],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="px-3 py-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition"
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-[13px] font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition"
              >
                Entrar
              </Link>
              <Link
                href="#planos"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full transition-colors"
              >
                Teste grátis
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-24">
        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="relative pb-10 overflow-hidden">
          {/* subtle page-level glow */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="absolute top-0 left-1/4 w-[50%] h-[400px] rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(16,185,129,0.10), transparent)",
              }}
            />
          </div>

          <div className="mx-auto max-w-7xl px-4 md:px-6">
            {/* announcement pill */}
            <div className="flex justify-center mb-8">
              <div className="group inline-flex items-center gap-2 text-[12px] bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded-full">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles size={10} strokeWidth={2} />
                  Novo
                </span>
                <span className="text-gray-600">
                  CRM feito por corretor, para corretor de planos de saúde
                </span>
                <ArrowRight
                  size={13}
                  className="text-gray-400 group-hover:translate-x-0.5 transition"
                />
              </div>
            </div>

            {/* bento hero — single card */}
            <BentoCard
              className="p-6 md:p-10"
              glowColor="radial-gradient(closest-side, #059669, transparent)"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                {/* left: copy */}
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                    CRM nº 1 para corretores de saúde
                  </span>

                  <h1
                    className="mt-5 text-[36px] sm:text-[48px] lg:text-[54px] leading-[1.02] font-bold tracking-[-0.03em] text-gray-900"
                    style={{ textWrap: "balance" } as CSSProperties}
                  >
                    Chega de planilha.{" "}
                    <GradientText>Controle real</GradientText> do seu funil e da
                    sua comissão.
                  </h1>

                  <p
                    className="mt-5 text-gray-500 text-[16px] md:text-[17px] max-w-[48ch] leading-relaxed"
                    style={{ textWrap: "pretty" } as CSSProperties}
                  >
                    O WinLeads profissionaliza o dia a dia do corretor de saúde:
                    pipeline visual, lotes de produção, métricas reais de
                    conversão e mapa de performance por região — tudo em uma só
                    ferramenta.
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Link
                      href="#planos"
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
                    >
                      Começar agora <ArrowRight size={15} />
                    </Link>
                    <Link
                      href="#como-funciona"
                      className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
                    >
                      <Play size={13} /> Ver como funciona
                    </Link>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-gray-400">
                    {["7 dias grátis", "Sem cartão de crédito", "100% mobile"].map(
                      (t) => (
                        <span key={t} className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                            <Check size={10} strokeWidth={2.5} />
                          </span>
                          {t}
                        </span>
                      )
                    )}
                  </div>

                  {/* stats row */}
                  <div className="mt-10 grid grid-cols-3 gap-4 max-w-[420px]">
                    {[
                      ["+3×", "mais negócios fechados"],
                      ["100%", "mobile, use no celular"],
                      ["5 min", "para começar a usar"],
                    ].map(([n, l]) => (
                      <div key={l}>
                        <div className="text-[22px] md:text-[24px] font-semibold tracking-tight text-emerald-600">
                          {n}
                        </div>
                        <div className="text-[11px] text-gray-400 leading-tight mt-0.5">
                          {l}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* right: phone mockup */}
                <div className="flex justify-center items-center py-4 lg:py-8">
                  <div className="relative animate-float">
                    {/* ambient glow */}
                    <div
                      className="absolute rounded-full blur-3xl pointer-events-none"
                      style={{
                        inset: "-25%",
                        background:
                          "radial-gradient(closest-side, rgba(16,185,129,0.20), rgba(20,184,166,0.08) 60%, transparent)",
                      }}
                    />

                    {/* phone shell */}
                    <div
                      className="relative"
                      style={{
                        width: "240px",
                        background:
                          "linear-gradient(160deg, #2c2c2c 0%, #141414 60%, #0a0a0a 100%)",
                        borderRadius: "2rem",
                        padding: "10px",
                        boxShadow: `
                          0 50px 100px rgba(0,0,0,0.40),
                          0 16px 40px rgba(0,0,0,0.25),
                          0 0 0 1.5px rgba(255,255,255,0.10),
                          inset 0 0 0 1px rgba(255,255,255,0.05)
                        `,
                      }}
                    >
                      {/* volume buttons — left */}
                      <div className="absolute rounded-l-sm" style={{ left: "-3.5px", top: "76px",  width: "3.5px", height: "26px", background: "#222" }} />
                      <div className="absolute rounded-l-sm" style={{ left: "-3.5px", top: "112px", width: "3.5px", height: "44px", background: "#222" }} />
                      <div className="absolute rounded-l-sm" style={{ left: "-3.5px", top: "166px", width: "3.5px", height: "44px", background: "#222" }} />
                      {/* power button — right */}
                      <div className="absolute rounded-r-sm" style={{ right: "-3.5px", top: "130px", width: "3.5px", height: "60px", background: "#222" }} />

                      {/* screen bezel */}
                      <div className="relative overflow-hidden bg-black" style={{ borderRadius: "1.6rem" }}>
                        {/* dynamic island */}
                        <div
                          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-black"
                          style={{ width: "100px", height: "28px", borderRadius: "999px" }}
                        />

                        {/* screenshot */}
                        <Image
                          src="/tela-dashboard2.jpeg"
                          alt="WinLeads no celular"
                          width={440}
                          height={952}
                          className="w-full h-auto block"
                          priority
                        />
                      </div>

                      {/* home indicator */}
                      <div className="flex justify-center py-2.5">
                        <div className="rounded-full" style={{ width: "72px", height: "4px", background: "rgba(255,255,255,0.15)" }} />
                      </div>
                    </div>

                    {/* floating card — top right */}
                    <div
                      className="absolute hidden lg:flex items-center gap-2.5 bg-white border border-gray-100 rounded-2xl px-3 py-2.5"
                      style={{
                        right: "-76px",
                        top: "48px",
                        minWidth: "152px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                      }}
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-600">
                        <TrendingUp size={14} />
                      </div>
                      <div>
                        <div className="text-[11.5px] font-semibold text-gray-900">+3 leads hoje</div>
                        <div className="text-[10px] text-gray-500">Pipeline atualizado</div>
                      </div>
                    </div>

                    {/* floating card — bottom left */}
                    <div
                      className="absolute hidden lg:block bg-white border border-gray-100 rounded-2xl px-3.5 py-3"
                      style={{
                        left: "-72px",
                        bottom: "80px",
                        minWidth: "134px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                      }}
                    >
                      <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wide">Conversão</div>
                      <div className="text-[26px] font-bold text-emerald-600 leading-none mt-1">18%</div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500">
                        <span>↗</span>
                        <span>vs. mês anterior</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* operadoras marquee */}
            <div className="mt-10">
              <div className="text-[11px] uppercase tracking-[0.22em] text-gray-400 font-mono text-center mb-4">
                Integrações nativas com as principais operadoras do Brasil
              </div>
              <div className="relative overflow-hidden mask-fade-x">
                <div
                  className="flex gap-3 animate-marquee"
                  style={{ width: "max-content" }}
                >
                  {[...Array(2)].flatMap((_, k) =>
                    [
                      { name: "Amil", src: "/imgs/planos/amil.png" },
                      { name: "Bradesco Saúde", src: "/imgs/planos/bradesco.png" },
                      { name: "Clinipam", src: "/imgs/planos/clinipam.png" },
                      { name: "Hapvida", src: "/imgs/planos/hapvida.png" },
                      { name: "LevMed", src: "/imgs/planos/levmed.png" },
                      { name: "Nossa Saúde", src: "/imgs/planos/nossasaude.png" },
                      { name: "NotreDame", src: "/imgs/planos/notredame.png" },
                      { name: "Select", src: "/imgs/planos/select.png" },
                      { name: "SulAmérica", src: "/imgs/planos/sulamerica.png" },
                      { name: "Unimed", src: "/imgs/planos/unimed.png" },
                    ].map((op, i) => (
                      <div
                        key={`${k}-${i}`}
                        className="bg-white border border-gray-200 px-5 py-3 flex items-center gap-3 rounded-xl shadow-sm"
                      >
                        <Image
                          src={op.src}
                          alt={op.name}
                          width={80}
                          height={32}
                          unoptimized
                          className="h-7 w-auto object-contain"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── POR QUE WINLEADS (BENTO) ──────────────────────── */}
        <section
          id="como-funciona"
          className="relative py-20 md:py-28 bg-gray-50/60 scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-start md:items-center gap-4 mb-12 text-left md:text-center">
              <Eyebrow>Como funciona</Eyebrow>
              <h2
                className="text-[34px] md:text-[50px] font-bold tracking-[-0.02em] text-gray-900 leading-[1.04] max-w-3xl"
                style={{ textWrap: "balance" } as CSSProperties}
              >
                Tudo que um corretor precisa{" "}
                <GradientText>num só sistema.</GradientText>
              </h2>
              <p
                className="text-gray-500 max-w-2xl text-[15.5px] leading-relaxed"
                style={{ textWrap: "pretty" } as CSSProperties}
              >
                Pare de pular entre planilhas, WhatsApp e cadernos. O WinLeads
                centraliza todo o ciclo da venda — da abordagem inicial à
                comissão recebida.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-[minmax(220px,auto)] gap-4">
              {/* 1. Pipeline visual (large) */}
              <BentoCard
                className="p-6 md:col-span-3 md:row-span-2"
                glowColor="radial-gradient(closest-side, #059669, transparent)"
              >
                <div className="flex items-center gap-2 text-emerald-600">
                  <LayoutDashboard size={18} />
                  <span className="text-[12px] uppercase tracking-widest font-mono text-gray-400">
                    Pipeline Visual
                  </span>
                </div>
                <h3 className="mt-3 text-[24px] md:text-[26px] font-semibold tracking-tight text-gray-900 leading-tight">
                  Veja onde cada lead está.{" "}
                  <span className="text-emerald-600">Arraste, qualifique,</span>{" "}
                  feche.
                </h3>
                <p className="mt-2 text-gray-500 text-[14px] leading-relaxed max-w-[44ch]">
                  Pipeline kanban personalizável por operadora ou produto — do
                  primeiro interesse à contratação assinada. Sem perder o fio
                  de nenhuma negociação.
                </p>
                <PipelineMini />
              </BentoCard>

              {/* 2. Lotes de Produção */}
              <BentoCard
                className="p-6 md:col-span-3"
                glowColor="radial-gradient(closest-side, #10b981, transparent)"
              >
                <div className="flex items-center gap-2 text-teal-600">
                  <FileText size={18} />
                  <span className="text-[12px] uppercase tracking-widest font-mono text-gray-400">
                    Lotes de Produção
                  </span>
                </div>
                <h3 className="mt-3 text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                  Registre toda sua produção diária{" "}
                  <span className="text-emerald-600">de uma vez.</span>
                </h3>
                <p className="mt-2 text-gray-500 text-[13.5px] leading-relaxed max-w-[42ch]">
                  Separe quantas abordagens fez por fonte de lead (retrabalho,
                  indicação, lead novo) e descubra onde sua produtividade é
                  maior.
                </p>
                <ProductionMini />
              </BentoCard>

              {/* 3. Follow-up */}
              <BentoCard
                className="p-6 md:col-span-3"
                glowColor="radial-gradient(closest-side, #0ea5e9, transparent)"
              >
                <div className="flex items-center gap-2 text-sky-500">
                  <Clock size={18} />
                  <span className="text-[12px] uppercase tracking-widest font-mono text-gray-400">
                    Follow-Up Visual
                  </span>
                </div>
                <h3 className="mt-3 text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                  Saiba exatamente{" "}
                  <span className="text-emerald-600">quem retornar hoje.</span>
                </h3>
                <p className="mt-2 text-gray-500 text-[13.5px] leading-relaxed max-w-[42ch]">
                  Acompanhe cada lead em todas as etapas — do interesse inicial
                  à avaliação da proposta — e nunca mais esqueça um contato no
                  meio do caminho.
                </p>
                <FollowUpMini />
              </BentoCard>

              {/* 4. Mapa de estados */}
              <BentoCard
                className="p-6 md:col-span-2"
                glowColor="radial-gradient(closest-side, #14b8a6, transparent)"
              >
                <div className="flex items-center gap-2 text-teal-500">
                  <MapPin size={18} />
                  <span className="text-[12px] uppercase tracking-widest font-mono text-gray-400">
                    Mapa de Estados
                  </span>
                </div>
                <h3 className="mt-3 text-[20px] font-semibold tracking-tight text-gray-900 leading-tight">
                  Foque onde você converte mais.
                </h3>
                <MapMini />
              </BentoCard>

              {/* 5. Métricas avançadas */}
              <BentoCard
                className="p-6 md:col-span-2"
                glowColor="radial-gradient(closest-side, #8b5cf6, transparent)"
              >
                <div className="flex items-center gap-2 text-violet-500">
                  <BarChart2 size={18} />
                  <span className="text-[12px] uppercase tracking-widest font-mono text-gray-400">
                    Métricas reais
                  </span>
                </div>
                <h3 className="mt-3 text-[20px] font-semibold tracking-tight text-gray-900 leading-tight">
                  Do achismo para números que orientam.
                </h3>
                <MetricsMini />
              </BentoCard>

              {/* 6. Mobile */}
              <BentoCard
                className="p-6 md:col-span-2"
                glowColor="radial-gradient(closest-side, #059669, transparent)"
              >
                <div className="flex items-center gap-2 text-emerald-600">
                  <Smartphone size={18} />
                  <span className="text-[12px] uppercase tracking-widest font-mono text-gray-400">
                    100% Mobile
                  </span>
                </div>
                <h3 className="mt-3 text-[20px] font-semibold tracking-tight text-gray-900 leading-tight">
                  O funil no seu bolso.
                </h3>
                <p className="mt-2 text-gray-500 text-[13.5px] leading-relaxed">
                  Atualize o status do lead em segundos logo após desligar a
                  ligação. O sistema foi otimizado para funcionar como app no
                  celular — sem instalar nada.
                </p>
                <div className="mt-5 flex items-center gap-2 text-[11.5px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                  Use como PWA · sem app store
                </div>
              </BentoCard>
            </div>
          </div>
        </section>

        {/* ── BENEFÍCIOS / PARA QUEM É ──────────────────────── */}
        <section id="beneficios" className="py-20 md:py-28 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div className="space-y-4">
                <Eyebrow>Funcionalidades</Eyebrow>
                <h2
                  className="text-[34px] md:text-[46px] font-bold tracking-[-0.02em] text-gray-900 leading-[1.04] max-w-2xl"
                  style={{ textWrap: "balance" } as CSSProperties}
                >
                  Do primeiro contato{" "}
                  <GradientText>à comissão no bolso.</GradientText>
                </h2>
              </div>
              <p className="text-gray-500 max-w-md text-[14.5px] leading-relaxed">
                Cada funcionalidade foi desenhada para o dia a dia de quem vende
                plano de saúde de verdade — não para um CRM genérico adaptado às
                pressas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {[
                {
                  icon: UserPlus,
                  color: "#059669",
                  bg: "#f0fdf4",
                  border: "#bbf7d0",
                  title: "Cadastro de leads por fonte",
                  body: "Registre cada contato com a origem exata: retrabalho, indicação, lead novo, ligação ou presencial. Saiba de onde vem sua conversão.",
                  tag: "Multi-canal",
                  span: "md:col-span-3",
                },
                {
                  icon: Filter,
                  color: "#0ea5e9",
                  bg: "#f0f9ff",
                  border: "#bae6fd",
                  title: "Funis personalizados por operadora",
                  body: "Crie pipelines separados para cada operadora ou produto. Veja o avanço de cada negociação em tempo real.",
                  tag: "Customizável",
                  span: "md:col-span-3",
                },
                {
                  icon: MapPin,
                  color: "#14b8a6",
                  bg: "#f0fdfa",
                  border: "#99f6e4",
                  title: "Mapa de performance por estado",
                  body: "Descubra visualmente em quais estados e cidades você fecha mais fácil. Foque seus esforços onde o mercado responde.",
                  tag: "Dashboard",
                  span: "md:col-span-2",
                },
                {
                  icon: BarChart2,
                  color: "#8b5cf6",
                  bg: "#faf5ff",
                  border: "#ddd6fe",
                  title: "Indicadores de conversão avançados",
                  body: "Taxa real de fechamento, ticket médio, tempo médio de ciclo por operadora. Dados que mudam sua estratégia.",
                  tag: "Métricas reais",
                  span: "md:col-span-2",
                },
                {
                  icon: TrendingUp,
                  color: "#f59e0b",
                  bg: "#fffbeb",
                  border: "#fde68a",
                  title: "Relatórios de produtividade",
                  body: "Saiba, por dia e por período, quantas abordagens você fez, quantas viraram leads e quantas fecharam. Sem achismo.",
                  tag: "Relatórios prontos",
                  span: "md:col-span-2",
                },
              ].map((it) => {
                const Icn = it.icon;
                return (
                  <BentoCard key={it.title} className={`p-6 ${it.span}`}>
                    <div className="flex items-center justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border"
                        style={{
                          background: it.bg,
                          borderColor: it.border,
                          color: it.color,
                        }}
                      >
                        <Icn size={20} />
                      </div>
                      <span className="text-[10.5px] font-mono uppercase tracking-widest text-gray-400">
                        {it.tag}
                      </span>
                    </div>
                    <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-gray-900 leading-snug">
                      {it.title}
                    </h3>
                    <p className="mt-2 text-gray-500 text-[13.5px] leading-relaxed">
                      {it.body}
                    </p>
                  </BentoCard>
                );
              })}

              {/* stat card */}
              <BentoCard
                className="p-6 md:col-span-2"
                glowColor="radial-gradient(closest-side, #059669, transparent)"
              >
                <div className="h-full flex flex-col">
                  <Eyebrow>Resultado médio</Eyebrow>
                  <div className="mt-4 text-[52px] font-bold tracking-tight text-emerald-600 leading-none">
                    3×
                  </div>
                  <div className="mt-1 text-gray-700 text-[15px]">
                    mais negócios fechados no 1º trimestre de uso.
                  </div>
                  <div className="mt-auto pt-5 text-[11px] text-gray-400 font-mono">
                    Baseado no feedback de corretores ativos no WinLeads
                  </div>
                </div>
              </BentoCard>
            </div>

            {/* "Para quem é" row */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-[18px] font-semibold text-gray-900">
                  Um sistema de corretor para corretor
                </h3>
                <p className="text-gray-500 text-[14px] leading-relaxed">
                  Se você ainda se perde em planilhas, mensagens soltas no
                  WhatsApp ou tenta controlar tudo na cabeça, o WinLeads foi
                  criado exatamente para o seu dia a dia.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[
                    {
                      title: "Mais controle dos contatos",
                      desc: "Veja quem precisa de retorno hoje, o histórico de conversas e o status exato de cada lead.",
                    },
                    {
                      title: "Zero oportunidade perdida",
                      desc: "Nunca mais esqueça de responder um interessado que pediu uma cotação ou ficou de falar com a família.",
                    },
                    {
                      title: "Visual simples e objetivo",
                      desc: "Desenvolvemos o sistema para você encontrar e usar tudo de forma fácil, direto do celular.",
                    },
                    {
                      title: "Indicadores que ajudam",
                      desc: "Entenda quais produtos vendem mais, qual região converte mais e quantos contatos você precisa para uma venda.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.title}
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-3">
                <h3 className="text-[18px] font-semibold text-gray-900">
                  Para quem o WinLeads foi criado?
                </h3>
                <div className="space-y-2.5 text-[14px] text-gray-700">
                  {[
                    "Corretores autônomos de planos de saúde",
                    "Pequenas equipes de vendas em corretoras",
                    "Quem vende plano individual, familiar ou empresarial",
                    "Corretores que já estão cansados de planilhas Excel",
                    "Quem quer entender de verdade seus números de vendas",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 shrink-0">
                        <Check size={11} strokeWidth={2.5} />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── DEPOIMENTOS ───────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-gray-50/60">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-start md:items-center gap-4 mb-12 text-left md:text-center">
              <Eyebrow>Prova social</Eyebrow>
              <h2
                className="text-[34px] md:text-[46px] font-bold tracking-[-0.02em] text-gray-900 leading-[1.04] max-w-3xl"
                style={{ textWrap: "balance" } as CSSProperties}
              >
                Corretores reais.{" "}
                <GradientText>Resultados reais.</GradientText>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  name: "Carlos Silva",
                  role: "Corretor autônomo · São Paulo/SP",
                  body: "Antes eu perdia lead todo dia por falta de organização. Com o WinLeads eu vejo exatamente quem precisa de retorno e quando. Triplicou minha taxa de conversão em 3 meses.",
                  result: "+185% em conversão",
                  glow: "#059669",
                },
                {
                  name: "Ana Carvalho",
                  role: "Gerente comercial · Saúde Mais",
                  body: "A funcionalidade de Lotes de Produção mudou como minha equipe registra o trabalho. Agora sei exatamente qual corretor tem a melhor performance por origem de lead.",
                  result: "Visibilidade total",
                  glow: "#0ea5e9",
                },
                {
                  name: "Ricardo Mendes",
                  role: "Corretor · Curitiba/PR",
                  body: "O mapa de estados me mostrou que eu convertia muito mais fácil em certos CEPs. Pedi leads focados nessa região e aumentei meu faturamento em 40% no mesmo mês.",
                  result: "+40% faturamento",
                  glow: "#8b5cf6",
                },
              ].map((q) => (
                <BentoCard
                  key={q.name}
                  className="p-6"
                  glowColor={`radial-gradient(closest-side, ${q.glow}, transparent)`}
                >
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={13} strokeWidth={0} fill="currentColor" />
                    ))}
                  </div>
                  <p
                    className="mt-4 text-gray-700 text-[15.5px] leading-snug"
                    style={{ textWrap: "pretty" } as CSSProperties}
                  >
                    &ldquo;{q.body}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] text-gray-900 font-medium truncate">
                        {q.name}
                      </div>
                      <div className="text-[11.5px] text-gray-400 truncate">
                        {q.role}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px] font-semibold text-emerald-600">
                        {q.result}
                      </div>
                    </div>
                  </div>
                </BentoCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── PLANOS ────────────────────────────────────────── */}
        <section id="planos" className="py-20 md:py-28 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-start md:items-center gap-4 mb-12 text-left md:text-center">
              <Eyebrow>Preços</Eyebrow>
              <h2
                className="text-[34px] md:text-[50px] font-bold tracking-[-0.02em] text-gray-900 leading-[1.02] max-w-3xl"
                style={{ textWrap: "balance" } as CSSProperties}
              >
                Um plano simples.{" "}
                <GradientText>Cancele quando quiser.</GradientText>
              </h2>
              <p className="text-gray-500 max-w-2xl text-[15.5px] leading-relaxed">
                7 dias grátis em qualquer plano. Sem cartão de crédito. Sem
                taxas escondidas.
              </p>
            </div>

            <div className="flex justify-center flex-col md:flex-row gap-5 items-stretch max-w-2xl mx-auto">
              {/* Plano Pro */}
              <div className="relative bg-white border-2 border-emerald-500 rounded-2xl p-6 md:p-8 shadow-[0_4px_32px_rgba(5,150,105,0.12)] flex flex-col flex-1">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase bg-emerald-600 text-white px-3 py-1 rounded-full">
                    Mais usado
                  </span>
                </div>
                <div
                  className="absolute -top-20 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(closest-side, #059669, transparent)",
                    opacity: 0.1,
                  }}
                />
                <h3 className="text-[18px] font-semibold text-gray-900">
                  Corretor Pro
                </h3>
                <p className="mt-1 text-[13px] text-gray-500">
                  Para o corretor autônomo que quer sair da planilha.
                </p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-[14px] text-gray-400">R$</span>
                  <span className="text-[44px] font-bold tracking-tight text-gray-900 leading-none">
                    47,90
                  </span>
                  <span className="text-[12.5px] text-gray-400 ml-1">/mês</span>
                </div>

                <Link
                  href="/login"
                  className="mt-6 w-full text-center inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-full transition-colors"
                >
                  Começar 7 dias grátis <ArrowRight size={14} />
                </Link>

                <div className="mt-7 pt-6 border-t border-gray-100 space-y-2.5">
                  {[
                    "Pipeline visual ilimitado",
                    "Até 1.000 leads",
                    "Lotes de Produção diários",
                    "Funis por operadora",
                    "Mapa de estados",
                    "Indicadores de conversão avançados",
                    "100% mobile",
                    "Suporte prioritário",
                  ].map((f) => (
                    <div
                      key={f}
                      className="flex items-start gap-2.5 text-[13px] text-gray-600"
                    >
                      <span className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                        <Check size={10} strokeWidth={2.5} />
                      </span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Plano Equipe */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col flex-1">
                <h3 className="text-[18px] font-semibold text-gray-900">
                  Equipe
                </h3>
                <p className="mt-1 text-[13px] text-gray-500">
                  Para corretoras que gerenciam um time de vendas.
                </p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-[28px] font-bold tracking-tight text-gray-900 leading-none">
                    Sob consulta
                  </span>
                </div>

                <Link
                  href="mailto:contato@winleads.com.br"
                  className="mt-6 w-full text-center inline-flex items-center justify-center gap-2 bg-white border border-gray-300 hover:border-emerald-400 hover:text-emerald-700 text-gray-700 text-sm font-medium py-2.5 rounded-full transition-colors"
                >
                  Falar com o time <ArrowRight size={14} />
                </Link>

                <div className="mt-7 pt-6 border-t border-gray-100 space-y-2.5">
                  {[
                    "Tudo do Corretor Pro",
                    "Vários corretores",
                    "Dashboards para gestor",
                    "Métricas por corretor e equipe",
                    "Treinamento e onboarding",
                    "Integrações personalizadas",
                  ].map((f) => (
                    <div
                      key={f}
                      className="flex items-start gap-2.5 text-[13px] text-gray-600"
                    >
                      <span className="w-4 h-4 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 shrink-0 mt-0.5">
                        <Check size={10} strokeWidth={2.5} />
                      </span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ─────────────────────────────────────── */}
        <section id="cta" className="py-20 md:py-28 bg-gray-50/60 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div
              className="relative bg-white border border-gray-200 rounded-3xl p-8 md:p-16 overflow-hidden shadow-[0_8px_48px_rgba(5,150,105,0.08)]"
            >
              {/* green glow washes */}
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute -top-32 -left-20 w-[60%] h-[100%] rounded-full"
                  style={{
                    background:
                      "radial-gradient(closest-side, rgba(16,185,129,0.12), transparent)",
                    filter: "blur(30px)",
                  }}
                />
                <div
                  className="absolute -bottom-32 -right-20 w-[60%] h-[100%] rounded-full"
                  style={{
                    background:
                      "radial-gradient(closest-side, rgba(20,184,166,0.10), transparent)",
                    filter: "blur(30px)",
                  }}
                />
              </div>

              <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-7">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                    Teste grátis por 7 dias
                  </span>
                  <h2
                    className="mt-5 text-[38px] md:text-[58px] font-bold tracking-[-0.03em] text-gray-900 leading-[1.0]"
                    style={{ textWrap: "balance" } as CSSProperties}
                  >
                    Pronto para ter{" "}
                    <GradientText>controle real</GradientText> das suas vendas?
                  </h2>
                  <p
                    className="mt-5 text-gray-500 text-[16px] md:text-[18px] max-w-[52ch] leading-relaxed"
                    style={{ textWrap: "pretty" } as CSSProperties}
                  >
                    Configure sua conta em menos de 5 minutos. Cadastre alguns
                    leads e veja na prática como um funil organizado faz
                    diferença no seu faturamento.
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-6 py-3 rounded-full transition-colors"
                    >
                      Começar agora <ArrowRight size={16} />
                    </Link>
                    <Link
                      href="#faq"
                      className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 text-sm font-medium px-6 py-3 rounded-full transition-colors"
                    >
                      Tirar dúvidas primeiro
                    </Link>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-4 text-[12.5px] text-gray-400">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      Login seguro
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Smartphone size={14} className="text-emerald-500" />
                      Configuração em 5 minutos
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw size={14} className="text-emerald-500" />
                      Cancele quando quiser
                    </span>
                  </div>
                </div>

                <div className="md:col-span-5 space-y-3">
                  {[
                    { k: "+3×", v: "mais negócios fechados" },
                    { k: "–60%", v: "de tempo perdido com organização" },
                    { k: "5 min", v: "para começar a usar hoje" },
                  ].map((s) => (
                    <div
                      key={s.v}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-4"
                    >
                      <span className="text-gray-600 text-[14px]">{s.v}</span>
                      <span className="text-emerald-600 font-bold text-[22px] tracking-tight">
                        {s.k}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────── */}
        <section id="faq" className="py-20 md:py-28 scroll-mt-20">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-12 space-y-4">
              <Eyebrow>Perguntas frequentes</Eyebrow>
              <h2 className="text-[32px] md:text-[44px] font-bold tracking-[-0.02em] text-gray-900">
                Ainda em dúvida?
              </h2>
              <p className="text-gray-500 text-[15px] max-w-xl mx-auto">
                Veja se alguma dessas perguntas responde o que você está
                pensando.
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-2">
              {[
                {
                  q: "Eu já controlo tudo na minha planilha de Excel. Por que mudar?",
                  a: "Planilhas são ótimas para listas, mas péssimas para gestão. O WinLeads não apenas guarda os nomes — ele calcula suas métricas automaticamente. Enquanto a planilha só te mostra quem você atendeu, o CRM te mostra onde você está ganhando dinheiro (qual estado, qual origem de lead) e qual é a sua taxa real de conversão. É a diferença entre anotar dados e ter inteligência de negócio.",
                },
                {
                  q: "Trabalho com leads de várias fontes no mesmo dia. O sistema aguenta essa rotina?",
                  a: 'O sistema foi desenhado exatamente para isso. A funcionalidade exclusiva de "Lotes de Produção" permite que você registre todo o seu esforço do dia de uma vez só, separando quantas abordagens fez para cada tipo de lead. Assim, você sabe exatamente se o lucro vem do esforço em retrabalhos ou da qualidade dos leads novos.',
                },
                {
                  q: "Não tenho tempo para ficar na frente do computador. O sistema funciona no celular?",
                  a: "Com certeza. O WinLeads é 100% otimizado para mobile. Você pode (e deve) usá-lo como aplicativo no seu celular. A ideia é atualizar o status do cliente em segundos, logo após desligar a chamada ou enviar o áudio no WhatsApp. O seu funil estará sempre no seu bolso.",
                },
                {
                  q: "O sistema me ajuda a saber onde devo focar minhas vendas?",
                  a: "Sim, esse é um dos grandes diferenciais. O Dashboard possui um Mapa de Performance que mostra em quais estados e cidades você tem a maior taxa de fechamento. Em vez de atirar para todo lado, você descobre visualmente onde vende mais fácil — e pode pedir leads mais qualificados nessa região.",
                },
                {
                  q: "Como funciona o período de teste?",
                  a: "Você tem 7 dias de uso completo sem precisar cadastrar cartão de crédito. Basta criar sua conta, cadastrar seus primeiros leads e explorar todas as funcionalidades livremente. Se decidir continuar, a assinatura é ativada ao final do período.",
                },
              ].map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden px-4"
                >
                  <AccordionTrigger className="text-sm text-left text-gray-900 font-medium hover:no-underline py-4">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-500 pb-4 leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* brand */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <span
                  className="relative w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #059669, #10b981 50%, #14b8a6)",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6l4 12 5-9 5 9 4-12" />
                  </svg>
                </span>
                <span className="font-semibold tracking-tight text-[15px] text-gray-900">
                  WinLeads
                </span>
              </Link>
              <p className="mt-4 text-[13px] text-gray-500 max-w-xs leading-relaxed">
                O CRM dos corretores de planos de saúde. Feito no Brasil, para
                o jeito brasileiro de vender saúde.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                Todos os sistemas operacionais
              </div>
            </div>

            {/* links */}
            {[
              {
                title: "Produto",
                items: [
                  ["Como funciona", "#como-funciona"],
                  ["Benefícios", "#beneficios"],
                  ["Planos", "#planos"],
                  ["Dúvidas", "#faq"],
                ],
              },
              {
                title: "Para você",
                items: [
                  ["Corretor autônomo", "#"],
                  ["Equipes comerciais", "#"],
                  ["Gestor de corretora", "#"],
                ],
              },
              {
                title: "Legal",
                items: [
                  ["Termos de uso", "/termos"],
                  ["Privacidade", "/privacidade"],
                  ["LGPD", "/privacidade"],
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <div className="text-[11px] uppercase tracking-[0.22em] text-gray-400 font-mono mb-3">
                  {col.title}
                </div>
                <ul className="space-y-2 text-[13px] text-gray-500">
                  {col.items.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="hover:text-gray-900 transition"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-[12px] text-gray-400">
            <div>
              © {new Date().getFullYear()} WinLeads. Victor Hugo Sistemas LTDA
              — CNPJ 54.046.645/0001-94
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Shield size={12} /> LGPD Compliant
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe size={12} /> pt-BR
              </span>
              <ManageCookiesLink />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
