"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "O que é carência e como funciona?",
    answer:
      "Carência é o período em que você paga o plano mas ainda não pode usar determinados serviços. Cada tipo de procedimento tem sua carência específica: consultas e exames simples geralmente têm 30 dias, enquanto internações e cirurgias podem chegar a 180 dias. Algumas condições, como emergências, têm atendimento imediato por lei.",
  },
  {
    question: "MEI pode ter plano empresarial?",
    answer:
      "Sim! O MEI (Microempreendedor Individual) pode contratar planos empresariais, geralmente com condições mais vantajosas que planos individuais. É necessário ter o CNPJ ativo há pelo menos 6 meses e, em alguns casos, incluir dependentes ou funcionários no plano.",
  },
  {
    question: "Qual a diferença entre abrangência nacional e regional?",
    answer:
      "Planos regionais oferecem cobertura em uma área específica (estado ou região metropolitana) e costumam ter mensalidades menores. Planos nacionais permitem atendimento em todo o Brasil, ideal para quem viaja frequentemente ou tem família em outros estados.",
  },
  {
    question: "Como funciona o processo de cotação?",
    answer:
      "Após preencher o formulário, nossa equipe analisa seu perfil e busca as melhores opções entre nossas operadoras parceiras. Em até 24 horas úteis, você receberá pelo WhatsApp uma proposta personalizada com valores, coberturas e benefícios de cada plano.",
  },
];

export function SectionFAQ() {
  return (
    <section className="py-16 px-4 bg-accent">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            Perguntas Frequentes
          </h2>
          <p className="mt-2 text-muted-foreground">
            Tire suas dúvidas sobre planos de saúde
          </p>
        </header>

        <Accordion type="single" collapsible className="space-y-3">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={item.question}
              value={`item-${index}`}
              className="rounded-xl border px-6 bg-white"
            >
              <AccordionTrigger className="py-5 text-left font-semibold hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
