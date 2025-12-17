"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type LinkStatus = "PENDING" | "ACTIVE" | "REJECTED";

type Link = {
  id: string;
  status: LinkStatus;
  removedAt: string | null;
  supervisor: { id: string; name: string | null; email: string; supervisorCode: string | null };
};

export default function JoinTeamPage() {
  const [user, loading] = useAuthState(auth);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<Link | null>(null);
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

  async function loadStatus() {
    setError(null);
    try {
      const res = await authedFetch("/api/team/join");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      setLink(data.link || null);
    } catch (e: any) {
      setError(e.message || "Erro");
    }
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/team/join", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      setLink(data.link);
      setCode("");
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/team/join", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro");
      await loadStatus();
    } catch (e: any) {
      setError(e.message || "Erro");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!loading && user) loadStatus();
  }, [loading, user]);

  return (
    <Layout>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Entrar em uma equipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            {!link || link.removedAt ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Digite o código do supervisor para solicitar entrada na equipe.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="CÓDIGO"
                    className="max-w-[220px] tracking-widest"
                  />
                  <Button disabled={busy || !code.trim()} onClick={join}>
                    Solicitar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {link.status === "PENDING" ? <Badge variant="secondary">Pendente</Badge> : null}
                  {link.status === "ACTIVE" ? <Badge>Ativo</Badge> : null}
                  {link.status === "REJECTED" ? <Badge variant="destructive">Negado</Badge> : null}
                </div>

                <p className="text-sm">
                  Supervisor: <strong>{link.supervisor.name || "Sem nome"}</strong> ({link.supervisor.email})
                </p>

                {link.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <Button disabled={busy} variant="outline" onClick={cancel}>
                      Cancelar solicitação
                    </Button>
                  </div>
                ) : null}

                {link.status === "ACTIVE" ? (
                  <p className="text-sm text-muted-foreground">
                    Você já está ativo na equipe. Para sair, peça ao supervisor para remover.
                  </p>
                ) : null}

                {link.status === "REJECTED" ? (
                  <p className="text-sm text-muted-foreground">
                    Sua solicitação foi negada. Você pode tentar novamente com outro código.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
