"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type LinkStatus = "PENDING" | "ACTIVE" | "REJECTED";

type TeamLink = {
  id: string;
  status: LinkStatus;
  createdAt: string;
  approvedAt: string | null;
  removedAt: string | null;
  broker: { id: string; name: string | null; email: string; createdAt: string };
};

export default function SupervisorTeamPage() {
  const [user, loading] = useAuthState(auth);
  const [busy, setBusy] = useState(false);

  const [isSupervisor, setIsSupervisor] = useState<boolean>(false);
  const [code, setCode] = useState<string | null>(null);
  const [links, setLinks] = useState<TeamLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function authedFetch(input: RequestInfo, init?: RequestInit) {
    if (!user) throw new Error("Não autenticado");
    const token = await user.getIdToken();
    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
    });
  }

  async function ensureCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/supervisor/code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      setIsSupervisor(true);
      setCode(data.supervisorCode);
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function loadTeam() {
    setError(null);
    try {
      const res = await authedFetch("/api/supervisor/team");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      setIsSupervisor(true);
      setCode(data.supervisorCode || null);
      setLinks(data.links || []);
    } catch (e: any) {
      setError(e.message || "Erro");
    }
  }

  async function action(linkId: string, action: "APPROVE" | "REJECT" | "REMOVE") {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/supervisor/team/action", {
        method: "POST",
        body: JSON.stringify({ linkId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      await loadTeam();
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!loading && user) loadTeam();
  }, [loading, user]);

  const pending = useMemo(() => links.filter((l) => l.status === "PENDING"), [links]);
  const active = useMemo(() => links.filter((l) => l.status === "ACTIVE"), [links]);

  return (
    <Layout>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Minha equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            {!isSupervisor ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Você ainda não está como supervisor. Gere seu código para começar.
                </p>
                <Button disabled={busy} onClick={ensureCode}>
                  Gerar código de supervisor
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>Supervisor</Badge>
                  {code ? (
                    <span className="text-sm">
                      Código: <strong className="tracking-widest">{code}</strong>
                    </span>
                  ) : null}
                </div>

                <p className="text-sm text-muted-foreground">
                  O corretor usa esse código para solicitar entrada na sua equipe. Você aprova ou nega.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {isSupervisor ? (
          <Card>
            <CardHeader>
              <CardTitle>Solicitações pendentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
              ) : (
                pending.map((l) => (
                  <div key={l.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{l.broker.name || "Sem nome"}</div>
                        <div className="text-sm text-muted-foreground">{l.broker.email}</div>
                      </div>
                      <Badge variant="secondary">Pendente</Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button disabled={busy} onClick={() => action(l.id, "APPROVE")}>
                        Aprovar
                      </Button>
                      <Button disabled={busy} variant="outline" onClick={() => action(l.id, "REJECT")}>
                        Negar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}

        {isSupervisor ? (
          <Card>
            <CardHeader>
              <CardTitle>Corretores ativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum corretor ativo.</p>
              ) : (
                active.map((l) => (
                  <div key={l.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{l.broker.name || "Sem nome"}</div>
                        <div className="text-sm text-muted-foreground">{l.broker.email}</div>
                      </div>
                      <Badge>Ativo</Badge>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button disabled={busy} variant="destructive" onClick={() => action(l.id, "REMOVE")}>
                        Remover da equipe
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Layout>
  );
}
