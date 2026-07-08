"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

export default function AguardandoAprovacaoPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const idToken = await getIdToken(user, true);
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();

      if (data?.ok) {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    });

    return () => unsub();
  }, [router]);

  async function handleLogout() {
    await signOut(auth);
    router.replace("/login");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Verificando...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 px-4">
      <Card className="w-full max-w-md shadow-xl border border-slate-200 rounded-2xl">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="h-14 w-14 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">
              Aguardando aprovação
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Sua conta ainda não foi aprovada por um administrador. Tente
              novamente mais tarde.
            </p>
          </div>
          <Button variant="outline" className="mt-2 gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
