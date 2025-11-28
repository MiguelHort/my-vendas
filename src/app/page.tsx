// app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  CheckCircle2,
  LineChart,
  Users,
  PhoneCall,
  LayoutDashboard,
  ShieldCheck,
  Clock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* NAVBAR */}
      <header className="border-b sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl border flex items-center justify-center text-xs font-bold">
              MV
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-sm md:text-base">
                WinLead
              </span>
              <span className="text-xs text-muted-foreground">
                CRM para corretores de saúde
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#como-funciona" className="hover:text-foreground">
              Como funciona
            </Link>
            <Link href="#beneficios" className="hover:text-foreground">
              Benefícios
            </Link>
            <Link href="#planos" className="hover:text-foreground">
              Planos
            </Link>
            <Link href="#faq" className="hover:text-foreground">
              Dúvidas
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="#cta">Começar agora</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1">
        {/* HERO */}
        <section className="border-b">
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <Badge className="rounded-full px-3 py-1 text-xs">
                Feito para corretores de planos de saúde
              </Badge>

              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
                  Organize suas vendas de planos de saúde em um só lugar.
                </h1>
                <p className="text-base md:text-lg text-muted-foreground">
                  WinLead é um micro-SaaS focado em corretores que querem
                  parar de perder leads, acompanhar o funil de vendas e ter
                  previsibilidade de comissões — sem planilhas confusas.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" asChild>
                  <Link href="#cta">
                    Começar gratuitamente
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#como-funciona">Ver como funciona</Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Dados seguros (PostgreSQL + Firebase Auth)</span>
                </div>
              </div>
            </div>

            {/* “Mock” do painel / funil */}
            <div className="hidden md:flex justify-end">
              <Card className="w-full max-w-md border-muted shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <LayoutDashboard className="h-4 w-4" />
                    Visão geral do corretor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-muted-foreground">
                    Últimas 4 semanas
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg border px-3 py-2">
                      <span className="text-muted-foreground">Leads</span>
                      <div className="text-lg font-semibold">128</div>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <span className="text-muted-foreground">
                        Propostas
                      </span>
                      <div className="text-lg font-semibold">47</div>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <span className="text-muted-foreground">Fechados</span>
                      <div className="text-lg font-semibold text-emerald-600">
                        19
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Funil de vendas</span>
                      <span className="text-muted-foreground">
                        Dispensado → Concluído
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-[10px]">
                      {["Dispensado", "Abordagem", "Avaliando", "Fechamento", "Concluído"].map(
                        (step, idx) => (
                          <div
                            key={step}
                            className="rounded-md border px-2 py-1 text-center truncate"
                          >
                            <span className={idx === 4 ? "font-semibold" : ""}>
                              {step}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section
          id="como-funciona"
          className="border-b bg-muted/40 scroll-mt-20"
        >
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold">
                  Como o WinLead funciona
                </h2>
                <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl">
                  Em poucos minutos você cria sua conta, importa seus leads e
                  passa a gerenciar todo o funil de planos de saúde em uma
                  ferramenta simples e objetiva.
                </p>
              </div>
              <Badge variant="outline">Micro-SaaS focado em vendas</Badge>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" />
                    Cadastre e organize seus leads
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Registre leads de WhatsApp, indicação, redes sociais,
                    campanhas e feiras em segundos.
                  </p>
                  <p>
                    Classifique por plano (individual, familiar, empresarial),
                    operadora e origem do lead.
                  </p>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PhoneCall className="h-4 w-4" />
                    Acompanhe o funil de contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Visualize cada lead no estágio certo: Dispensado,
                    Abordagem, Avaliando, Fechamento e Concluído.
                  </p>
                  <p>
                    Saiba exatamente quem precisa de retorno hoje e evite
                    esquecer follow-ups importantes.
                  </p>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LineChart className="h-4 w-4" />
                    Tenha previsibilidade de comissões
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Acompanhe vendas fechadas por período, ticket médio e
                    projeção de comissões.
                  </p>
                  <p>
                    Descubra quais canais trazem leads que realmente viram
                    clientes de plano de saúde.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* BENEFÍCIOS / PARA QUEM É */}
        <section id="beneficios" className="border-b scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-[1.2fr,1fr] gap-10">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-semibold">
                Feito sob medida para corretores de planos de saúde.
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl">
                Se você ainda se perde em planilhas, mensagens soltas no
                WhatsApp ou tenta controlar tudo na cabeça, o WinLead foi
                criado exatamente para o seu dia a dia.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      Mais controle dos contatos
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      Veja quem precisa de retorno hoje, o histórico de
                      conversas e o status exato de cada lead.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      Zero oportunidade perdida
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      Nunca mais esqueça de responder um interessado que pediu
                      uma cotação ou ficou de falar com a família.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      Pipeline claro, sem confusão
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      Visual simples do funil, específico para vendas de
                      planos de saúde — nada de recursos genéricos demais.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <div>
                    <div className="font-medium">Indicadores que ajudam</div>
                    <p className="text-muted-foreground text-xs mt-1">
                      Entenda quais planos e operadoras mais convertem e onde
                      está vazando seu funil.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco lateral “Para quem é” */}
            <Card className="self-start">
              <CardHeader>
                <CardTitle className="text-base">
                  Para quem o WinLead foi criado?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>✔ Corretores autônomos de planos de saúde</p>
                <p>✔ Pequenas equipes de vendas em corretoras</p>
                <p>✔ Quem vende plano individual, familiar ou empresarial</p>
                <p>✔ Corretores que já estão cansados de planilhas Excel</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" className="border-b bg-muted/40 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
            <div className="text-center max-w-3xl mx-auto mb-8 space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold">
                Planos simples e diretos, como seu dia deveria ser.
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Comece com o plano ideal para você e evolua quando sua carteira
                crescer. Sem letras miúdas.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Plano 1 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Iniciante</span>
                    <Badge variant="outline">Até 100 leads</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <span className="text-2xl font-semibold">R$ 0</span>
                    <span className="text-muted-foreground text-xs ml-1">
                      / mês
                    </span>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• 1 corretor</li>
                    <li>• Funil completo de vendas</li>
                    <li>• Cadastro básico de leads</li>
                    <li>• Relatórios simples</li>
                  </ul>
                  <Button className="w-full mt-2" variant="outline" asChild>
                    <Link href="#cta">Começar grátis</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Plano 2 - destaque */}
              <Card className="border-primary shadow-sm relative">
                <div className="absolute -top-2 right-4">
                  <Badge className="text-[10px]">Mais usado</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Corretor Pro</span>
                    <Badge variant="outline">Até 1.000 leads</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <span className="text-2xl font-semibold">R$ 97</span>
                    <span className="text-muted-foreground text-xs ml-1">
                      / mês
                    </span>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Tudo do plano Iniciante</li>
                    <li>• Funis personalizados por operadora</li>
                    <li>• Indicadores avançados de conversão</li>
                    <li>• Suporte prioritário</li>
                  </ul>
                  <Button className="w-full mt-2" asChild>
                    <Link href="#cta">Quero ser Pro</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Plano 3 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Equipe</span>
                    <Badge variant="outline">Time de vendas</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <span className="text-2xl font-semibold">Sob consulta</span>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Vários corretores</li>
                    <li>• Dashboards para gestor</li>
                    <li>• Treinamento e onboarding</li>
                    <li>• Integrações personalizadas</li>
                  </ul>
                  <Button className="w-full mt-2" variant="outline" asChild>
                    <Link href="mailto:contato@WinLead.com">
                      Falar com o time
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA PRINCIPAL */}
        <section
          id="cta"
          className="border-b bg-linear-to-br from-background via-background to-muted/70 scroll-mt-20"
        >
          <div className="max-w-3xl mx-auto px-4 py-12 md:py-16 text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-semibold">
              Pronto para ter controle real das suas vendas de planos de saúde?
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Crie sua conta, cadastre alguns leads e veja na prática como um
              funil organizado faz diferença no seu faturamento — mesmo que
              você seja um corretor autônomo.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/login">
                  Começar agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#faq">Tirar dúvidas primeiro</Link>
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground mt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Configuração em menos de 5 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Login seguro com Firebase</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b scroll-mt-20">
          <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
            <h2 className="text-2xl md:text-3xl font-semibold text-center mb-6">
              Perguntas frequentes
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-xl mx-auto">
              Ainda em dúvida? Veja se alguma dessas perguntas responde o que
              você está pensando.
            </p>

            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm text-left">
                  O WinLead é só para planos de saúde?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Ele foi pensado principalmente para corretores que vendem
                  planos de saúde (individual, familiar e empresarial). Mas se
                  você vende outros tipos de seguros e gosta de um funil simples,
                  também pode usar.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm text-left">
                  Preciso instalar alguma coisa no meu computador?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Não. O WinLead é 100% online. Você acessa pelo navegador,
                  tanto no computador quanto no celular.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm text-left">
                  Meus dados e dos meus clientes estão seguros?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Sim. Utilizamos autenticação via Firebase e banco de dados
                  Postgres/Supabase, com boas práticas de segurança e
                  armazenamento em nuvem.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm text-left">
                  Consigo cancelar quando quiser?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Claro. Você pode cancelar o plano pago a qualquer momento e
                  continuar tendo acesso ao que estiver previsto no plano
                  gratuito.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 py-6 text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} WinLead.</span>
            <span>Todos os direitos reservados.</span>
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
