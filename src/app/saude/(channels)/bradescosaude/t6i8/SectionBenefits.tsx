// app/saude/SectionBenefits.tsx
import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    title: "Clube de Vantagens",
    body: `O Clube de Vantagens é um benefício exclusivo para quem tem plano Hapvida ou Hapvida +Odonto. Com ele, você aproveita descontos especiais em farmácias, compras online, entretenimento, educação, bem-estar e muito mais. Tudo pensado para facilitar sua rotina e oferecer mais qualidade de vida para você!`,
    image: "/imgs/hapvida/clube-vantagen.jpg",
  },
  {
    title: "Teleconsulta",
    body: `Com a Teleconsulta, você conta mais de 20 especialidades para cuidar da sua saúde com conforto e qualidade, sem precisar sair da sua rotina. Além disso, também disponibilizamos pronto atendimento 24h, com clínico geral ou pediatra, para casos que precisam de atendimento imediato.`,
    image: "/imgs/hapvida/teleconsulta.jpg",
  },
  {
    title: "Qualivida",
    body: `Os programas Qualivida são desenvolvidos para promover saúde, qualidade de vida e bem-estar aos nossos beneficiários. Oferecemos programas gratuitos voltados para gestantes, pacientes diabéticos, oncológicos, cardiopatas, idosos, pessoas com obesidade, problemas na coluna e doenças crônicas.`,
    image: "/imgs/hapvida/qualivida.png",
  },
];

export default function SectionBenefits() {
  return (
    <section className="w-full bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Título */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-red-800">
            Confira os benefícios
          </h2>
          <div className="mt-2 h-1 w-16 rounded-full bg-zinc-500" />
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map((b) => (
            <Card
              key={b.title}
              className="overflow-hidden border-red-100 bg-white shadow-sm transition hover:shadow-md pt-0"
            >
              {/* IMAGEM */}
              <div className="relative h-40 w-full">
                <Image
                  src={b.image}
                  alt={b.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>

              <CardHeader>
                <CardTitle className="text-lg text-red-800">
                  {b.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-2">
                <p className="text-sm leading-relaxed text-red-700/80">
                  {b.body}
                </p>
              </CardContent>

            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
