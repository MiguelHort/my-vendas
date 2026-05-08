"use client";

import * as React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Settings, Percent, AlertCircle } from "lucide-react";
import Image from "next/image";
import { OPERADORAS } from "@/components/LeadCard";

type CommissionRow = {
  id: string;
  operadora: string;
  comissao_interna: number;
  comissao_externa: number;
};

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ConfiguracoesPage() {
  const [firebaseUser, loadingAuth] = useAuthState(auth);
  const [rows, setRows] = React.useState<CommissionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  // draft: operadora -> { interna, externa }
  const [draft, setDraft] = React.useState<
    Record<string, { interna: string; externa: string }>
  >({});
  const debouncedDraft = useDebounce(draft, 600);
  const savedRef = React.useRef<Record<string, { interna: number; externa: number }>>({});

  const authParams = React.useMemo(() => {
    if (!firebaseUser) return null;
    return new URLSearchParams({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || "",
    });
  }, [firebaseUser]);

  // Fetch
  React.useEffect(() => {
    if (!authParams) return;
    setLoading(true);
    fetch(`/api/configuracoes/comissoes?${authParams}`)
      .then((r) => r.json())
      .then((data: CommissionRow[]) => {
        setRows(data);
        const initial: Record<string, { interna: string; externa: string }> = {};
        const saved: Record<string, { interna: number; externa: number }> = {};
        data.forEach((r) => {
          initial[r.operadora] = {
            interna: String(r.comissao_interna),
            externa: String(r.comissao_externa),
          };
          saved[r.operadora] = {
            interna: r.comissao_interna,
            externa: r.comissao_externa,
          };
        });
        setDraft(initial);
        savedRef.current = saved;
      })
      .catch(() => toast.error("Erro ao carregar comissões"))
      .finally(() => setLoading(false));
  }, [authParams]);

  // Auto-save when debounced draft changes
  React.useEffect(() => {
    if (!authParams || Object.keys(debouncedDraft).length === 0) return;

    for (const operadora of Object.keys(debouncedDraft)) {
      const d = debouncedDraft[operadora];
      const interna = parseFloat(d.interna);
      const externa = parseFloat(d.externa);
      if (isNaN(interna) || isNaN(externa)) continue;

      const prev = savedRef.current[operadora];
      if (prev && prev.interna === interna && prev.externa === externa) continue;

      // Save this operadora
      fetch(`/api/configuracoes/comissoes?${authParams}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operadora, comissao_interna: interna, comissao_externa: externa }),
      })
        .then((r) => r.json())
        .then((updated: CommissionRow) => {
          savedRef.current[operadora] = {
            interna: updated.comissao_interna,
            externa: updated.comissao_externa,
          };
          setRows((prev) =>
            prev.map((r) => (r.operadora === operadora ? updated : r))
          );
        })
        .catch(() => toast.error(`Erro ao salvar ${operadora}`));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft]);

  const setField = (
    operadora: string,
    field: "interna" | "externa",
    value: string
  ) => {
    setDraft((prev) => ({
      ...prev,
      [operadora]: { ...prev[operadora], [field]: value },
    }));
  };

  if (loadingAuth || loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!firebaseUser) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Você precisa estar logado.</p>
        </div>
      </Layout>
    );
  }

  // Merge: show all OPERADORAS, fallback to 100 if not yet in rows
  const displayRows = OPERADORAS.map((op) => {
    const found = rows.find((r) => r.operadora === op.nome);
    return {
      operadora: op.nome,
      logo: op.logo,
      comissao_interna: found?.comissao_interna ?? 100,
      comissao_externa: found?.comissao_externa ?? 100,
    };
  });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Settings className="h-3.5 w-3.5" />
            Configurações
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Comissões dos Planos</h1>
          <p className="text-sm text-muted-foreground">
            Defina as porcentagens de comissão interna e externa para cada operadora.
            As alterações são salvas automaticamente.
          </p>
        </div>

        {/* Tabela */}
        <div className="rounded-2xl border overflow-hidden shadow-sm">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Operadora</span>
            <span className="w-28 text-center">Interna (%)</span>
            <span className="w-28 text-center">Externa (%)</span>
          </div>

          {displayRows.map((row, i) => {
            const d = draft[row.operadora] ?? {
              interna: String(row.comissao_interna),
              externa: String(row.comissao_externa),
            };

            return (
              <div
                key={row.operadora}
                className={`grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3 ${
                  i !== displayRows.length - 1 ? "border-b" : ""
                }`}
              >
                {/* Operadora */}
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src={row.logo}
                    alt={row.operadora}
                    width={80}
                    height={24}
                    className="h-6 w-auto object-contain shrink-0"
                  />
                </div>

                {/* Interna */}
                <div className="relative w-28">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={d.interna}
                    onChange={(e) => setField(row.operadora, "interna", e.target.value)}
                    className="pr-7 text-sm text-right rounded-xl h-9"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>

                {/* Externa */}
                <div className="relative w-28">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={d.externa}
                    onChange={(e) => setField(row.operadora, "externa", e.target.value)}
                    className="pr-7 text-sm text-right rounded-xl h-9"
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted-foreground text-right">
          Salvo automaticamente ao digitar
        </p>
      </div>
    </Layout>
  );
}
