"use client";

import * as React from "react";
import { ArrowLeft, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResultadoCotacao } from "@/lib/px/cotacao";
import { NovaCotacao } from "./NovaCotacao";
import { PropostaCotacao } from "./PropostaCotacao";
import type { AuthHeader, StatusSyncDto } from "./comum";

/**
 * Cotação de dentro de uma conversa: calcula, e ao escolher uma opção mostra o cartão da
 * proposta (pra tirar print e mandar pro lead). Salvar a cotação vale pro lead da conversa.
 */
export function CotacaoConversaModal({
  open,
  onOpenChange,
  authHeader,
  cliente,
  lead,
  corretor,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authHeader: AuthHeader;
  /** Nome que aparece na proposta. */
  cliente: string | null;
  /** Lead da conversa (onde a cotação é guardada); null = ainda não há lead. */
  lead: { id: string; nome: string } | null;
  corretor: string | null;
  email: string | null;
}) {
  const [produtos, setProdutos] = React.useState<StatusSyncDto["produtos"]>([]);
  const [proposta, setProposta] = React.useState<{ opcao: ResultadoCotacao; em: Date } | null>(null);

  // Regiões disponíveis (produtos sincronizados) — carrega ao abrir.
  React.useEffect(() => {
    if (!open) return;
    let cancelado = false;
    (async () => {
      const headers = await authHeader();
      if (!headers) return;
      try {
        const res = await fetch("/api/px/sync", { headers });
        if (res.ok && !cancelado) setProdutos(((await res.json()) as StatusSyncDto).produtos);
      } catch {
        // sem regiões: o seletor mostra o aviso
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [open, authHeader]);

  function fechar(aberto: boolean) {
    onOpenChange(aberto);
    if (!aberto) setProposta(null);
  }

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Calculator className="size-5" />
            <DialogTitle>Cotação{cliente ? ` — ${cliente}` : ""}</DialogTitle>
          </div>
          <DialogDescription>
            {proposta
              ? "Tire um print do cartão abaixo e envie pro cliente."
              : "Calcule e clique em “Proposta” na opção escolhida pra gerar o cartão."}
          </DialogDescription>
        </DialogHeader>

        {/* Mantém montado (só esconde) pra não perder o resultado ao voltar da proposta */}
        <div className={proposta ? "hidden" : undefined}>
          <NovaCotacao
            authHeader={authHeader}
            produtos={produtos}
            leads={[]}
            leadInicial={null}
            leadFixo={lead}
            onSalva={() => {}}
            onGerarProposta={(opcao) => setProposta({ opcao, em: new Date() })}
          />
        </div>

        {proposta && (
          <div className="space-y-4">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setProposta(null)}>
              <ArrowLeft className="size-4" />
              Voltar às opções
            </Button>
            <PropostaCotacao
              opcao={proposta.opcao}
              cliente={cliente}
              corretor={corretor}
              email={email}
              geradoEm={proposta.em}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
