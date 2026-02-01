// app/SectionHome.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Lock,
  Shield,
  Sparkles,
  HeartHandshake,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function claritySet(key: string, value: string) {
  if (typeof window === "undefined") return;
  const c = (window as any).clarity;
  if (typeof c === "function") c("set", key, value);
}
function clarityEvent(name: string) {
  claritySet(`evt_${name}`, String(Date.now()));
}

export default function SectionHome() {
  React.useEffect(() => {
    claritySet("HeroViewed", "true");
    claritySet("OperadoraFocus", "hapvida");
  }, []);

  const handleScrollToQuiz = () => {
    clarityEvent("HeroCTAClick");
    claritySet("ClickedCTA", "hero_hapvida");

    const quizSection = document.getElementById("quiz-section");
    if (!quizSection) return;

    quizSection.scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(() => {
      const firstButton = quizSection.querySelector("button");
      if (firstButton) (firstButton as HTMLButtonElement).focus();
    }, 700);
  };

  return (
    <section className="relative overflow-hidden bg-blue-800">
      {/* BG azul + acentos orange */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_50%_-120px,rgba(255,255,255,0.14),transparent_60%),radial-gradient(900px_420px_at_10%_10%,rgba(249,115,22,0.18),transparent_55%),radial-gradient(900px_460px_at_90%_15%,rgba(255,255,255,0.10),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.24) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.24) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 md:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          {/* LEFT */}
          <div className="text-center lg:text-left">
            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              <Badge className="rounded-full bg-white/10 text-white border border-white/20 px-4 py-1.5 text-[10px] backdrop-blur">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
                Cotação rápida Hapvida
              </Badge>

              <Badge className="rounded-full bg-white/10 text-white border border-white/20 px-4 py-1.5 text-[10px] backdrop-blur">
                <BadgeCheck className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
                100% gratuito
              </Badge>

              <Badge className="rounded-full bg-white/10 text-white border border-white/20 px-4 py-1.5 text-[10px] backdrop-blur">
                <Lock className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
                Sem robô e sem insistência
              </Badge>
            </div>

            {/* Headline */}
            <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-5xl">
              Seu Plano de Saúde{" "}
              <span className="text-orange-500">Hapvida</span>, do jeito que a sua
              Família merece.
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 lg:mx-0">
              Em menos de 1 minuto, você informa seu perfil e recebe uma{" "}
              <span className="font-semibold text-white">
                cotação personalizada
              </span>{" "}
              do plano Hapvida — com orientação humana, no seu tempo.
            </p>

            {/* benefícios (clean) */}
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
              <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">
                    Cotação por perfil
                  </div>
                  <div className="text-sm text-white/75">
                    Individual, família, empresa ou MEI.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
                  <Shield className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">
                    Atendimento sem pressão
                  </div>
                  <div className="text-sm text-white/75">
                    Você escolhe se quer falar com corretor.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">
                    Opções na sua região
                  </div>
                  <div className="text-sm text-white/75">
                    A gente prioriza o que faz sentido pra sua cidade.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
                  <HeartHandshake className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">
                    Ajuda humana
                  </div>
                  <div className="text-sm text-white/75">
                    Explicamos as opções com clareza.
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10">
              <Button
                onClick={handleScrollToQuiz}
                size="lg"
                className="h-16 w-full rounded-2xl sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center justify-center px-7"
              >
                Fazer simulação Hapvida
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>

              <div className="mt-3 text-xs text-white/70">
                Sem compromisso • Sem ligações automáticas • Você no controle
              </div>
            </div>
          </div>

          {/* RIGHT: imagem família + card compacto */}
          <div className="relative">
            {/* Imagem (troque o src pelo nome exato do arquivo em /public) */}
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-xl backdrop-blur">
              <div className="relative h-[320px] w-full sm:h-[380px]">
                <Image
                  src="/imgs/hapvida/familia.jpg"
                  alt="Família feliz"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
                {/* overlay sutil */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/55 via-blue-900/10 to-transparent" />
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
              </div>

              {/* Card info clean embaixo */}
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-18 items-center justify-center rounded-2xl bg-white/80 border border-white/15">
                    <Image
                      src="/imgs/planos/hapvida.png"
                      alt="Logo Hapvida"
                      width={120}
                      height={60}
                      className="h-6 w-auto object-contain"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">
                      Simulação em 1 minuto
                    </div>
                    <div className="text-sm text-white/75">
                      Valores, carências e coberturas explicados com clareza.
                    </div>
                  </div>

                  <Badge className="rounded-full bg-white/10 text-white border border-white/15">
                    Hapvida
                  </Badge>
                </div>

                <div className="mt-4 grid gap-2">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/15 text-orange-500">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    Você recebe as melhores opções pro seu perfil
                  </div>

                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/15 text-orange-500">
                      <Lock className="h-4 w-4" />
                    </span>
                    Seus dados são usados apenas para atendimento
                  </div>

                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/15 text-orange-500">
                      <Shield className="h-4 w-4" />
                    </span>
                    Atendimento humano, no seu tempo
                  </div>
                </div>
              </div>
            </div>

            {/* acentos */}
            <div className="pointer-events-none absolute -left-10 -bottom-10 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-10 bottom-8 h-24 w-24 rounded-full bg-orange-500/15 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
