// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { loginWithEmail } from "@/lib/auth";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginWithEmail(email, password);
      const token = await result.user.getIdToken();

      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!data?.ok) {
        if (data?.reason === "pending-approval") {
          setError(
            "Sua conta está aguardando aprovação de um administrador."
          );
        } else {
          setError("Não foi possível acessar sua conta.");
        }
        await signOut(auth);
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Email ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-linear-to-br from-slate-100 to-slate-200 px-4">
      <Link href="/login" className="flex items-center gap-3">
        <Image
          src="/imgs/logo01.png"
          alt="WinLeads"
          width={186}
          height={100}
          unoptimized
        />
      </Link>
      <Card className="w-full max-w-md shadow-xl border border-slate-200 rounded-2xl backdrop-blur-sm bg-white/80">
        <CardHeader className="space-y-2 pb-2">
          <CardTitle className="text-3xl font-semibold text-center text-slate-800">
            Bem-vindo ao <span className="text-primary">WinLeads</span>
          </CardTitle>

          <CardDescription className="text-center text-slate-500 text-sm">
            Acesse sua conta para gerenciar seus clientes.
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-1">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full h-11 mt-1" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-sm text-center text-slate-500 mt-5">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-primary hover:underline">
              Cadastre-se
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
