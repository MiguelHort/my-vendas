"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ConsentModalProps {
  token: string;
  onAccepted: () => void;
}

const CONSENT_VERSION = "1.0";

export default function ConsentModal({ token, onAccepted }: ConsentModalProps) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    setLoading(true);
    try {
      const res = await fetch("/api/lgpd/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ version: CONSENT_VERSION, type: "privacy_and_terms" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Falha ao salvar consentimento:", res.status, data);
        toast.error("Erro ao salvar aceite. Tente novamente.");
        setLoading(false);
        return;
      }

      onAccepted();
    } catch (err) {
      console.error("Erro de rede ao salvar consentimento:", err);
      toast.error("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open modal>
      <DialogContent
        className="max-w-md"
        // Remove o X de fechar para tornar o modal bloqueante
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Bem-vindo ao WinLeads</DialogTitle>
          <DialogDescription>
            Para continuar, leia e aceite nossa Política de Privacidade e
            Termos de Uso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm text-muted-foreground">
          <p>
            O WinLeads coleta e processa seus dados pessoais para fornecer o
            serviço de CRM, processar pagamentos e melhorar a plataforma,
            conforme descrito na nossa Política de Privacidade.
          </p>
          <p>
            Você pode exportar ou excluir seus dados a qualquer momento em{" "}
            <strong>Configurações → Minha Conta</strong>.
          </p>
        </div>

        <div className="flex items-start gap-3 py-2">
          <Checkbox
            id="consent-check"
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
          />
          <Label htmlFor="consent-check" className="text-sm leading-snug cursor-pointer">
            Li e aceito a{" "}
            <Link
              href="/privacidade"
              target="_blank"
              className="underline hover:text-foreground"
            >
              Política de Privacidade
            </Link>{" "}
            e os{" "}
            <Link
              href="/termos"
              target="_blank"
              className="underline hover:text-foreground"
            >
              Termos de Uso
            </Link>{" "}
            (versão {CONSENT_VERSION}).
          </Label>
        </div>

        <Button
          className="w-full"
          disabled={!checked || loading}
          onClick={handleAccept}
        >
          {loading ? "Salvando..." : "Continuar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
