// app/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CardForm from "./CardForm";
import SectionHome from "./SectionHome";
import { SectionFAQ } from "@/app/saude/SectionFAQ";
import SectionBenefits from "./SectionBenefits";
import WhatsAppFloat from "@/app/saude/WhatsAppFloat";

function claritySet(key: string, value: string) {
  if (typeof window === "undefined") return;
  const c = (window as any).clarity;
  if (typeof c === "function") c("set", key, value);
}

function clarityEvent(name: string) {
  claritySet(`evt_${name}`, String(Date.now()));
}

export default function Page() {
  // ✅ 1) Landing carregou + UTMs
  React.useEffect(() => {
    clarityEvent("LandingLoaded");

    const sp = new URLSearchParams(window.location.search);
    const utm_source = sp.get("utm_source") || "";
    const utm_medium = sp.get("utm_medium") || "";
    const utm_campaign = sp.get("utm_campaign") || "";
    const utm_content = sp.get("utm_content") || "";
    const utm_term = sp.get("utm_term") || "";
    const fbclid = sp.get("fbclid") || "";

    claritySet("utm_source", utm_source);
    claritySet("utm_medium", utm_medium);
    claritySet("utm_campaign", utm_campaign);
    claritySet("utm_content", utm_content);
    claritySet("utm_term", utm_term);
    claritySet("fbclid", fbclid);

    claritySet(
      "device",
      /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
    );
  }, []);

  // ✅ 2) Viu a seção do formulário
  React.useEffect(() => {
    const el = document.getElementById("quiz-section");
    if (!el) return;

    let fired = false;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !fired) {
          fired = true;
          clarityEvent("FormSectionViewed");
          claritySet("FormSectionViewed", "true");
          obs.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-red-800">
      {/* textura sutil */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(30,64,175,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,64,175,0.25) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-red-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-800 text-white shadow-sm">
              <Heart className="h-5 w-5" />
            </div>

            <div className="leading-tight">
              <div className="text-base font-semibold text-red-800">
                WinLeads <span className="text-zinc-500">Saúde</span>
              </div>
              <div className="hidden text-xs text-red-600 sm:block">
                Triagem rápida • Cotação personalizada
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className={cn(
                "opacity-0 pointer-events-none text-red-800 hover:bg-red-50",
              )}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
              bg-zinc-50 text-zinc-600 border border-zinc-200">
              Atendimento em até 15 min
            </div>
          </div>
        </div>
      </header>

      {/* BODY */}
      <main>
        <WhatsAppFloat />
        <SectionHome />

        <SectionBenefits />

        {/* FORMULÁRIO */}
        <section id="quiz-section" className="py-10">
          <CardForm />

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-red-600">
            <ShieldCheck className="h-4 w-4 text-zinc-500" />
            <span>Fluxo otimizado para conversão • rápido e sem fricção</span>
          </div>
        </section>
      </main>

      <SectionFAQ />

      {/* FOOTER */}
      <footer className="border-t border-red-100 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-red-600 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © {new Date().getFullYear()} WinLeads. Produto desenvolvido por Victor
            Hugo Sistemas LTDA – CNPJ 54.046.645/0001-94
          </div>

          <div className="flex items-center gap-4">
            <Link href="/termos" className="hover:text-red-800">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="hover:text-red-800">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
