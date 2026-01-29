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
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SectionHome() {
  const items = [
    { name: "NotreDame", path: "notredame" },
    { name: "Hapvida", path: "hapvida" },
    { name: "Clinipam", path: "clinipam" },
    { name: "Bradesco Saúde", path: "bradescosaude" },
    { name: "SulAmérica", path: "sulamerica" },
    { name: "Amil", path: "amil" },
  ];

  const handleScrollToQuiz = () => {
    const quizSection = document.getElementById("quiz-section");
    if (!quizSection) return;

    quizSection.scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(() => {
      const firstButton = quizSection.querySelector("button");
      if (firstButton) (firstButton as HTMLButtonElement).focus();
    }, 700);
  };

  return (
    <section className="relative overflow-hidden">
      {/* BG mais clean (menos “show”, mais “confiança”) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />
        <div className="absolute -top-20 right-[-140px] h-[520px] w-[520px] rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-180px] h-[520px] w-[520px] rounded-full bg-emerald-200/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 md:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.35fr_1fr]">
          {/* LEFT */}
          <div className="text-center lg:text-left">
            {/* Badges de valor + segurança */}
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              <div className="flex gap-2">
                <Badge className="rounded-full bg-transparent border-primary border-2 px-4 py-1.5 text-primary text-[10px]">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Simulação rápida
                </Badge>
                <Badge className="rounded-full bg-white/75 px-4 py-1.5 text-primary ring-1 ring-primary/10 backdrop-blur text-[10px]">
                  <BadgeCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  100% gratuito
                </Badge>
              </div>

              <Badge className="rounded-full bg-white/75 px-4 py-1.5 text-primary ring-1 ring-primary/10 backdrop-blur text-[10px]">
                <Lock className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Sem ligações automáticas
              </Badge>
            </div>

            {/* PROMESSA (alinhada com anúncio) */}
            <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-5xl">
              Descubra se você pode{" "}
              <span className="text-primary">pagar menos</span> no plano de
              saúde
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-ls text-muted-foreground lg:mx-0">
              Em menos de 1 minuto, você faz uma simulação e recebe opções para
              o seu perfil.{" "}
              <span className="font-semibold text-foreground">
                Você decide se quer falar com um corretor.
              </span>
            </p>

            {/* MICRO-PROVAS / BENEFÍCIOS (curtos e claros) */}
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
              <div className="flex items-start gap-3 rounded-2xl border bg-white/70 p-4 backdrop-blur">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-foreground">
                    Veja opções para seu perfil
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Individual, família, empresa ou MEI.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border bg-white/70 p-4 backdrop-blur">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Shield className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-foreground">
                    Atendimento humano e sem pressão
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Nada de robôs ou insistência.
                  </div>
                </div>
              </div>
            </div>

            {/* CTA principal + texto de segurança */}
            <div className="mt-10">
              <Button
                onClick={handleScrollToQuiz}
                size="lg"
                className="h-16 w-full rounded-2xl sm:w-auto"
              >
                Fazer simulação gratuita
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="relative">
            <div className="rounded-3xl border bg-white/65 p-4 shadow-xl shadow-primary/5 backdrop-blur">
              {/* Cabeçalho do card */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white/75 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Operadoras populares
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Escolha melhor custo-benefício
                    </div>
                  </div>
                </div>

                <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary">
                  Atualizado
                </Badge>
              </div>

              {/* Logos */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((item, idx) => (
                  <div
                    key={item.path}
                    className="flex items-center justify-center rounded-2xl border bg-white/75 p-3 backdrop-blur"
                    aria-label={`Operadora ${item.name}`}
                  >
                    <Image
                      src={`/imgs/planos/${item.path}.png`}
                      alt={`Logo ${item.name}`}
                      width={120}
                      height={60}
                      className="h-9 w-auto object-contain"
                      priority={idx < 3}
                    />
                  </div>
                ))}
              </div>

              {/* Prova social + confiança */}
              <div className="mt-4 rounded-2xl border bg-white/75 p-4 backdrop-blur">
                <div className="text-sm font-semibold text-foreground">
                  Mais confiança antes de você preencher
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Simulação gratuita, sem compromisso e sem ligações
                  automáticas. Você escolhe se quer atendimento.
                </p>

                <div className="mt-3 grid gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    Receba opções para seu perfil e região
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Lock className="h-4 w-4" /> 
                    </span>
                    Seus dados são usados apenas para atendimento
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserCheck className="h-4 w-4" />
                    </span>
                    + 700 pessoas já simularam seu plano com a WinLeads Saúde e
                    seus corretores
                  </div>
                </div>
              </div>
            </div>

            {/* acento */}
            <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
