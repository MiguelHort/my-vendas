// app/page.tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Leaf, ShieldCheck, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CardForm from "./CardForm";
import SectionHome from "./SectionHome";
import { SectionFAQ } from "./SectionFAQ";

export default function Page() {
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
            {/* O botão "Voltar" real fica dentro do CardForm, mas deixei aqui um exemplo,
                caso você queira mostrar algo sempre no header. */}
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className={cn(
                "hover:bg-emerald-50 opacity-0 pointer-events-none",
              )}
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
        <SectionHome />

        {/* FORMULÁRIO */}

        <section className="mt-20 py-8">
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
            © {new Date().getFullYear()} WinLeads. WinLeads é um produto desenvolvido por Victor Hugo Sistemas LTDA – CNPJ 54.046.645/0001-94
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
