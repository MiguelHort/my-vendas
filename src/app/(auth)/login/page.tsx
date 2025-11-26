// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Chama a API para sincronizar com o banco (tabela users)
      await fetch("/api/sync-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName,
        }),
      });

      router.push("/");
    } catch (err: any) {
      console.error(err);
      setError("Erro ao entrar com Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 px-4">
      <Card className="w-full max-w-md shadow-xl border border-slate-200 rounded-2xl backdrop-blur-sm bg-white/80">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex justify-center mb-2">
            <Image
              src="/logo-myvendas.svg"
              alt="my-vendas logo"
              width={80}
              height={80}
              className="opacity-90"
            />
          </div>

          <CardTitle className="text-3xl font-semibold text-center text-slate-800">
            Bem-vindo ao <span className="text-primary">my-vendas</span>
          </CardTitle>

          <CardDescription className="text-center text-slate-500 text-sm">
            Acesse sua conta para gerenciar suas vendas e clientes.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 mt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full h-14 flex items-center justify-center gap-3 border-slate-300 hover:bg-slate-100 transition-all text-slate-700"
            onClick={handleGoogle}
            disabled={loading}
          >
            <Image
              src="/google-logo.png"
              alt="Google Logo"
              width={22}
              height={22}
              className="opacity-90"
            />
            {loading ? "Conectando..." : "Continuar com Google"}
          </Button>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}