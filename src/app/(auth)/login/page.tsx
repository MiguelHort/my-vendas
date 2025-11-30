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
import Link from "next/link";
import { Line } from "recharts";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck } from "lucide-react";

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

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Erro ao entrar com Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-linear-to-br from-slate-100 to-slate-200 px-4">
      <Link href="/dashboard" className="flex items-center gap-3">
        <Image
          src="/imgs/logo01.png"
          alt="WinLead"
          width={128}
          height={32}
          unoptimized
        />
      </Link>
      <Card className="w-full max-w-md shadow-xl border border-slate-200 rounded-2xl backdrop-blur-sm bg-white/80">
        <CardHeader className="space-y-2 pb-2">
          <CardTitle className="text-3xl font-semibold text-center text-slate-800">
            Bem-vindo ao <span className="text-primary">WinLead</span>
          </CardTitle>

          <CardDescription className="text-center text-slate-500 text-sm">
            Acesse sua conta para gerenciar seus clientes.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5 mt-1">
          <Button
            type="button"
            variant="outline"
            className="w-full h-14 flex items-center justify-center gap-3 border-slate-300 hover:bg-slate-100 transition-all text-slate-800 rounded-xl"
            onClick={handleGoogle}
            disabled={loading}
          >
            <Image
              src="/google-logo.png"
              alt="Google Logo"
              width={28}
              height={28}
              className="opacity-90"
            />
            {loading ? "Conectando..." : "Entrar com Google"}
          </Button>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Separator className="mt-3" />

          <div className="flex items-center justify-center gap-3 my-2">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <p className="text-sm text-center text-slate-600">
              Login seguro com autenticação do Google
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
