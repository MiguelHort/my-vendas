"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "cookie_consent";

export type CookiePreferences = {
  essential: true;
  analytics: boolean;
};

export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

function savePreferences(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event("cookie-consent-change"));
}

export function resetCookieConsent() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("cookie-consent-change"));
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const check = () => {
      setVisible(getCookiePreferences() === null);
    };
    check();
    window.addEventListener("cookie-consent-change", check);
    return () => window.removeEventListener("cookie-consent-change", check);
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    savePreferences({ essential: true, analytics: true });
    setVisible(false);
    setShowCustomize(false);
  };

  const rejectNonEssential = () => {
    savePreferences({ essential: true, analytics: false });
    setVisible(false);
    setShowCustomize(false);
  };

  const saveCustom = () => {
    savePreferences({ essential: true, analytics: analyticsEnabled });
    setVisible(false);
    setShowCustomize(false);
  };

  return (
    <>
      {/* Banner principal */}
      {!showCustomize && (
        <div
          role="dialog"
          aria-label="Preferências de cookies"
          className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Usamos cookies</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Utilizamos cookies essenciais para o funcionamento da plataforma
                e, com sua autorização, cookies de analytics para melhorar a
                experiência. Veja nossa{" "}
                <Link href="/privacidade" className="underline hover:text-foreground">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAnalyticsEnabled(false);
                  setShowCustomize(true);
                }}
              >
                Personalizar
              </Button>
              <Button variant="outline" size="sm" onClick={rejectNonEssential}>
                Rejeitar não essenciais
              </Button>
              <Button size="sm" onClick={acceptAll}>
                Aceitar todos
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de personalização */}
      <Dialog open={showCustomize} onOpenChange={(open) => !open && setShowCustomize(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Personalizar cookies</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Essenciais — sempre ligados */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="font-medium">Cookies essenciais</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Necessários para autenticação e funcionamento básico da
                  plataforma. Não podem ser desativados.
                </p>
              </div>
              <Switch checked disabled aria-label="Cookies essenciais (sempre ativo)" />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="font-medium">Cookies de analytics</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Utilizamos o Microsoft Clarity para entender como a plataforma
                  é usada e melhorar a experiência. Nenhum dado é vendido a
                  terceiros.
                </p>
              </div>
              <Switch
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
                aria-label="Cookies de analytics"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={rejectNonEssential}>
              Rejeitar todos
            </Button>
            <Button size="sm" onClick={saveCustom}>
              Salvar preferências
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
