"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  Sparkles,
  Lock,
  BadgeCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function SectionHome() {
  const items = [
    { name: "NotreDame", path: "notredame" },
    { name: "Hapvida", path: "hapvida" },
    { name: "Clinipam", path: "clinipam" },
    { name: "Bradesco Saúde", path: "bradescosaude" },
    { name: "SulAmérica", path: "sulamerica" },
    { name: "Amil", path: "amil" },
  ];

  const BENEFITS = [
    "Comparação gratuita",
    "Sem compromisso",
    "Melhores preços",
  ];

  const toFileName = (planName: string) =>
    planName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .replace(/\s+/g, "") // remove espaços
      .replace(/[^a-zA-Z0-9]/g, ""); // remove caracteres especiais

  const handleScrollToQuiz = () => {
    const quizSection = document.getElementById("quiz-section");
    if (!quizSection) return;

    quizSection.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      const firstButton = quizSection.querySelector("button");
      if (firstButton) (firstButton as HTMLButtonElement).focus();
    }, 800);
  };

  return (
    <section className="relative overflow-hidden">
      {/* BG (simplificado, mais “hero”) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-emerald-50 via-white to-white" />
        <div className="absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/3 translate-x-1/4 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] translate-y-1/3 -translate-x-1/4 rounded-full bg-emerald-200/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[2fr_1fr]">
          {/* Left */}
          <div className="text-center lg:text-left">
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              <Badge className="rounded-full bg-primary/15 px-4 py-1.5 text-primary">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Compare e economize
              </Badge>

              <Badge className="rounded-full bg-white/70 px-4 py-1.5 text-primary ring-1 ring-primary/10 backdrop-blur">
                <BadgeCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Cotação gratuita
              </Badge>
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Encontre o <span className="text-primary">Plano de Saúde</span>{" "}
              ideal para você
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground lg:mx-0">
              Compare as melhores operadoras do Brasil e receba uma cotação
              personalizada em minutos.
              <span className="font-semibold text-foreground">
                {" "}
                Sem compromisso!
              </span>
            </p>

            {/* Benefits Pills */}
            <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
              {BENEFITS.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-2 rounded-full border bg-white/70 px-3 py-2 text-sm backdrop-blur"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA (não mexer no ArrowRight) */}
            <div className="mt-10">
              <Button
                onClick={handleScrollToQuiz}
                size="lg"
                className="h-16 rounded-2xl"
              >
                Iniciar cotação gratuita
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>

              <p className="mt-3 text-sm text-muted-foreground">
                Responda algumas perguntas e receba ofertas exclusivas
              </p>
            </div>
          </div>

          {/* Right (AGORA COM LOGOS) */}
          <div className="relative">
            {/* frame */}
            <div className="rounded-3xl border bg-white/60 p-4 shadow-xl shadow-primary/5 backdrop-blur">
              <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div className="text-sm font-semibold">
                    Operadoras populares
                  </div>
                </div>
                <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary">
                  Atualizado
                </Badge>
              </div>

              <div className="relative mt-4 h-[360px] overflow-hidden rounded-2xl">
                {/* fade mask */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-linear-to-b from-white/95 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-linear-to-t from-white/95 to-transparent" />

                <div className="animate-scroll-vertical space-y-3 py-2">
                  {[...items, ...items, ...items].map((item, index) => {
                    const file = item.path;
                    return (
                      <div
                        key={`${item.name}-${index}`}
                        className="mx-auto flex w-[92%] items-center justify-between gap-4 rounded-2xl border bg-white/75 p-4 shadow-sm backdrop-blur"
                      >
                        <div className="relative">
                          <Image
                            src={`/imgs/planos/${file}.png`}
                            alt={`Logo ${item.name}`}
                            width={68}
                            height={48}
                            className="h-full w-full object-contain"
                            priority={index < 3}
                          />
                        </div>

                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          Ver ofertas
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border bg-white/70 p-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">Dica:</span>{" "}
                quanto mais completo o perfil, melhor a cotação.
              </div>
            </div>

            {/* floating accent */}
            <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
