"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, Calculator, Copy, Download, Loader2, Send } from "lucide-react";
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
import { gerarImagemProposta } from "./imagemProposta";

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
  conversationId,
  onEnviada,
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
  /** Conversa que recebe a imagem (envio pelo WhatsApp). */
  conversationId: string | null;
  /** Chamado depois de enviar a imagem (pra atualizar o chat). */
  onEnviada?: () => void;
}) {
  const [produtos, setProdutos] = React.useState<StatusSyncDto["produtos"]>([]);
  const [proposta, setProposta] = React.useState<{ opcao: ResultadoCotacao; em: Date } | null>(null);
  const [acao, setAcao] = React.useState<"enviar" | "copiar" | "baixar" | null>(null);

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

  async function gerarPng() {
    if (!proposta) throw new Error("Nenhuma proposta");
    return gerarImagemProposta({
      opcao: proposta.opcao,
      cliente,
      corretor,
      email,
      geradoEm: proposta.em,
    });
  }

  async function enviarPeloWhatsApp() {
    if (!proposta || !conversationId) return;
    setAcao("enviar");
    try {
      const headers = await authHeader();
      if (!headers) return;
      const blob = await gerarPng();
      const form = new FormData();
      form.append("file", new File([blob], "cotacao.png", { type: "image/png" }));
      const res = await fetch(`/api/whatsapp/conversations/${conversationId}/media`, {
        method: "POST",
        headers,
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar a imagem");
      toast.success("Cotação enviada como imagem");
      onEnviada?.();
      fechar(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar a imagem");
    } finally {
      setAcao(null);
    }
  }

  async function copiarImagem() {
    setAcao("copiar");
    try {
      const blob = await gerarPng();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Imagem copiada — é só colar (Ctrl+V)");
    } catch {
      toast.error("Não foi possível copiar a imagem neste navegador. Use \"Baixar\".");
    } finally {
      setAcao(null);
    }
  }

  async function baixarImagem() {
    setAcao("baixar");
    try {
      const blob = await gerarPng();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cotacao-${(cliente ?? "cliente").replace(/[^\w-]+/g, "_")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível gerar a imagem");
    } finally {
      setAcao(null);
    }
  }

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
              ? "Envie a imagem direto pelo WhatsApp, copie ou baixe."
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
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setProposta(null)}>
                <ArrowLeft className="size-4" />
                Voltar às opções
              </Button>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={baixarImagem} disabled={acao !== null}>
                  {acao === "baixar" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Baixar
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={copiarImagem} disabled={acao !== null}>
                  {acao === "copiar" ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                  Copiar
                </Button>
                {conversationId && (
                  <Button size="sm" className="gap-1.5" onClick={enviarPeloWhatsApp} disabled={acao !== null}>
                    {acao === "enviar" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Enviar no WhatsApp{cliente ? ` para ${cliente}` : ""}
                  </Button>
                )}
              </div>
            </div>
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
