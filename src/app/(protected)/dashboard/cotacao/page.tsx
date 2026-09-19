"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NovaCotacao } from "@/components/cotacao/NovaCotacao";
import { HistoricoCotacoes } from "@/components/cotacao/HistoricoCotacoes";
import { SincronizacaoPx } from "@/components/cotacao/SincronizacaoPx";
import type {
  AuthHeader,
  CotacaoSalvaDto,
  LeadResumo,
  StatusSyncDto,
} from "@/components/cotacao/comum";
import { Calculator } from "lucide-react";

function Conteudo() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);
  const leadParam = useSearchParams().get("lead");

  const [aba, setAba] = React.useState("cotar");
  const [leads, setLeads] = React.useState<LeadResumo[]>([]);
  const [cotacoes, setCotacoes] = React.useState<CotacaoSalvaDto[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = React.useState(true);
  const [status, setStatus] = React.useState<StatusSyncDto | null>(null);
  const [carregandoStatus, setCarregandoStatus] = React.useState(true);
  const [soDoLead, setSoDoLead] = React.useState(true);

  const authHeader = React.useCallback<AuthHeader>(async () => {
    if (!firebaseUser) return null;
    const token = await firebaseUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [firebaseUser]);

  const carregarHistorico = React.useCallback(async () => {
    const headers = await authHeader();
    if (!headers) return;
    try {
      const qs = leadParam && soDoLead ? `?lead_id=${encodeURIComponent(leadParam)}` : "";
      const res = await fetch(`/api/px/cotacoes${qs}`, { headers });
      if (res.ok) setCotacoes((await res.json()).cotacoes ?? []);
    } finally {
      setCarregandoHistorico(false);
    }
  }, [authHeader, leadParam, soDoLead]);

  const carregarStatus = React.useCallback(async () => {
    const headers = await authHeader();
    if (!headers) return;
    try {
      const res = await fetch("/api/px/sync", { headers });
      if (res.ok) setStatus(await res.json());
    } finally {
      setCarregandoStatus(false);
    }
  }, [authHeader]);

  React.useEffect(() => {
    if (!firebaseUser || loadingAuth) return;
    carregarHistorico();
    carregarStatus();
  }, [firebaseUser, loadingAuth, carregarHistorico, carregarStatus]);

  // Leads pro seletor (API antiga, autenticada por query string).
  React.useEffect(() => {
    if (!firebaseUser) return;
    const params = new URLSearchParams({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "",
    });
    fetch(`/api/leads?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; nome: string; telefone: string | null }[]) =>
        setLeads(data.map((l) => ({ id: l.id, nome: l.nome, telefone: l.telefone })))
      )
      .catch(() => {});
  }, [firebaseUser]);

  const leadDoFiltro = leads.find((l) => l.id === leadParam)?.nome ?? null;

  if (loadingAuth) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <header className="mb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Calculator className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider">Planos de saúde</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Cotação</h1>
        <p className="text-sm text-muted-foreground">
          Calculada com as tabelas de preço sincronizadas da PX — sem consultar a PX na hora.
        </p>
      </header>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="cotar">Cotar</TabsTrigger>
          <TabsTrigger value="historico">Cotações salvas</TabsTrigger>
          <TabsTrigger value="sincronizacao">Sincronização</TabsTrigger>
        </TabsList>

        <TabsContent value="cotar" className="mt-4">
          <NovaCotacao
            authHeader={authHeader}
            leads={leads}
            leadInicial={leadParam}
            onSalva={carregarHistorico}
          />
        </TabsContent>

        <TabsContent value="historico" className="mt-4 space-y-3">
          {leadParam && (
            <Button variant="outline" size="sm" onClick={() => setSoDoLead((v) => !v)}>
              {soDoLead ? "Ver cotações de todos os leads" : "Ver só as deste lead"}
            </Button>
          )}
          <HistoricoCotacoes
            cotacoes={cotacoes}
            carregando={carregandoHistorico}
            leadFiltrado={leadParam && soDoLead ? (leadDoFiltro ?? "este lead") : null}
          />
        </TabsContent>

        <TabsContent value="sincronizacao" className="mt-4">
          <SincronizacaoPx
            authHeader={authHeader}
            status={status}
            carregando={carregandoStatus}
            onAtualizada={carregarStatus}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function CotacaoPage() {
  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <React.Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <Conteudo />
        </React.Suspense>
      </div>
    </Layout>
  );
}
