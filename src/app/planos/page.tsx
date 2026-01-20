// app/planos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, getIdToken, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  ShieldCheck,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function PlanosPage() {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setCheckingAuth(false);
    });

    return () => unsub();
  }, []);

  async function handleAssinar() {
    try {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setLoadingCheckout(true);

      const token = await getIdToken(firebaseUser, true);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Erro ao criar checkout:", data);
        alert("Erro ao iniciar pagamento. Tente novamente.");
        return;
      }

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url; // Stripe Checkout
      } else {
        alert("Resposta inválida do servidor.");
      }
    } catch (err) {
      console.error("Erro em handleAssinar:", err);
      alert("Erro ao iniciar pagamento.");
    } finally {
      setLoadingCheckout(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background via-background to-muted/70 px-4">
        <Card className="w-full max-w-sm border border-primary/10 shadow-lg shadow-primary/10">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Validando seu acesso ao plano...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <header className="border-b sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 md:py-4">
          <Link href="/" className="flex items-center gap-2">
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
          </Link>
          </div>
      </header>

      <div className="min-h-screen bg-linear-to-b from-background via-background to-muted/70 px-4 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-stretch">
          {/* Coluna de contexto / hierarquia de informação */}
          <section className="flex-1 space-y-6">
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-[0.18em]"
            >
              Plano do WinLead CRM
            </Badge>

            <header className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Organize seus leads e feche mais negócios
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
                Tenha uma visão clara do seu funil, acompanhe o desempenho por
                estado e origem, e tome decisões com base em dados — tudo em um
                único lugar.
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <p className="text-xs font-medium text-primary uppercase tracking-wide">
                  Para quem é
                </p>
                <p className="text-sm font-semibold">
                  Times comerciais e consultores independentes
                </p>
                <p className="text-xs text-muted-foreground">
                  Ideal para quem precisa acompanhar leads de várias origens e
                  não quer se perder em planilhas.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-2">
                <p className="text-xs font-medium text-primary uppercase tracking-wide">
                  Benefícios
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-3 w-3 mt-0.5 text-emerald-500" />
                    <span>Funil visual por etapa.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3 w-3 mt-0.5 text-emerald-500" />
                    <span>Métricas de taxa de fechamento.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3 w-3 mt-0.5 text-emerald-500" />
                    <span>Relatórios por período e estado.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="hidden lg:block">
              <Separator />
              <p className="mt-4 text-xs text-muted-foreground max-w-md">
                Ao lado você vê o resumo do plano e o valor mensal. A
                contratação é feita com segurança pela Stripe e você pode
                cancelar quando quiser.
              </p>
            </div>
          </section>

          {/* Coluna de pricing / ação principal */}
          <aside className="w-full lg:w-[380px]">
            <Card className="h-full border border-primary/15 shadow-xl shadow-primary/10 rounded-2xl">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-[0.18em]"
                    >
                      Plano recomendado
                    </Badge>

                    <CardTitle className="text-2xl font-bold tracking-tight">
                      Plano Mensal
                    </CardTitle>

                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold leading-none">
                        R$ 47,90
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / mês
                      </span>
                    </div>

                    <CardDescription className="text-sm">
                      Acesso completo ao CRM, sem limite de leads e sem
                      fidelidade. Perfeito para testar na prática com seu fluxo
                      real de vendas.
                    </CardDescription>
                  </div>

                  <div className="flex flex-col items-end text-[11px] text-muted-foreground gap-2">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 border-green-500/70 text-green-700"
                    >
                      <ShieldCheck className="h-4 w-4" />7 dias de garantia
                    </Badge>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 border-purple-500/70 text-purple-700"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pagamento Stripe
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Você terá acesso a:
                  </p>
                  <ul className="grid gap-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-emerald-500" />
                      <span>Cadastro ilimitado de leads e negócios.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-emerald-500" />
                      <span>Funil de vendas com visão por etapa.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-emerald-500" />
                      <span>Dashboard com métricas e taxa de fechamento.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-emerald-500" />
                      <span>Relatórios por estado, origem e período.</span>
                    </li>
                  </ul>
                </div>

                <Separator />

                <div className="space-y-3 text-xs text-muted-foreground">
                  {!firebaseUser && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-400/60 bg-amber-50/80 px-3 py-2 dark:bg-amber-950/40">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500" />
                      <p>
                        Você precisa estar logado para contratar o plano. Ao
                        clicar em{" "}
                        <span className="font-medium">“Entrar e assinar”</span>{" "}
                        você será redirecionado para a página de login.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Pagamento 100% seguro
                    </span>
                    <span>Sem fidelidade — cancele quando quiser.</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button
                  onClick={handleAssinar}
                  disabled={loadingCheckout}
                  size="lg"
                  className="w-full"
                  aria-busy={loadingCheckout}
                  aria-disabled={loadingCheckout}
                >
                  {loadingCheckout && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {loadingCheckout
                    ? "Redirecionando para o pagamento..."
                    : firebaseUser
                    ? "Assinar agora"
                    : "Entrar e assinar"}
                </Button>

                <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                  Pagamento processado com segurança pela Stripe. Seus dados de
                  cartão não são armazenados pelo CRM e você pode cancelar a
                  qualquer momento.
                </p>
              </CardFooter>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}
