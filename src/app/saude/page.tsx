// app/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Leaf, ShieldCheck, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CardForm from "./CardForm";
import SectionHome from "./SectionHome";
import { SectionFAQ } from "./SectionFAQ";

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

  // ✅ 2) Viu a seção do formulário (quiz-section)
  React.useEffect(() => {
    const el = document.getElementById("quiz-section");
    if (!el) return;

    let fired = false;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && !fired) {
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
    <div className="min-h-screen text-foreground bg-[radial-gradient(1200px_500px_at_50%_-100px,rgba(16,185,129,0.18),transparent_60%),radial-gradient(900px_400px_at_10%_10%,rgba(34,197,94,0.12),transparent_55%),radial-gradient(900px_450px_at_90%_15%,rgba(20,184,166,0.10),transparent_55%)]">
      {/* textura sutil */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(16,185,129,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* HEADER */}
      <header className="border-b bg-background/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
              <Heart className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold">
                WinLeads <span className="text-primary">Saúde</span>
              </div>
              <div className="hidden text-xs text-muted-foreground sm:block">
                Triagem rápida • Cotação personalizada
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className={cn("hover:bg-emerald-50 opacity-0 pointer-events-none")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-emerald-50/70 text-primary border border-primary/70">
              <Leaf className="h-3.5 w-3.5" />
              Atendimento em até 15 min
            </div>
          </div>
        </div>
      </header>

      {/* BODY */}
      <main>
        <div>
          <SectionHome />
        </div>

        {/* FORMULÁRIO */}
        <section id="quiz-section" className="py-8">
          <CardForm />

          <div className="mt-8 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary/80" />
            <span>Fluxo otimizado para conversão • rápido e sem fricção</span>
          </div>
        </section>
      </main>

      <SectionFAQ />

      {/* FOOTER */}
      <footer className="border-t bg-background/60 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © {new Date().getFullYear()} WinLeads. WinLeads é um produto
            desenvolvido por Victor Hugo Sistemas LTDA – CNPJ 54.046.645/0001-94
          </div>
          <div className="flex items-center gap-4">
            <Link href="/termos" className="hover:text-foreground">
              Termos de uso
            </Link>
            <Link href="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
