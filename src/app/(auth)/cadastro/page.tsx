"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { registerWithEmail } from "@/lib/auth";

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
import { CheckCircle2 } from "lucide-react";

export default function CadastroPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const result = await registerWithEmail(email, password, name);

      await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: result.user.uid,
          email,
          name,
        }),
      });

      await signOut(auth);
      setDone(true);
    } catch (err: any) {
      console.error(err);
      if (err?.code === "auth/email-already-in-use") {
        setError("Já existe uma conta com esse email.");
      } else {
        setError("Erro ao criar cadastro. Tente novamente.");
      }
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
        {done ? (
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-800">
                Cadastro enviado!
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Aguarde a aprovação de um administrador para acessar sua conta.
              </p>
            </div>
            <Button className="mt-2" onClick={() => router.push("/login")}>
              Voltar para o login
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader className="space-y-2 pb-2">
              <CardTitle className="text-3xl font-semibold text-center text-slate-800">
                Criar conta
              </CardTitle>
              <CardDescription className="text-center text-slate-500 text-sm">
                Sua conta precisa ser aprovada por um administrador antes do
                primeiro acesso.
              </CardDescription>
            </CardHeader>

            <CardContent className="mt-1">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>

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
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" className="w-full h-11 mt-1" disabled={loading}>
                  {loading ? "Enviando..." : "Cadastrar"}
                </Button>
              </form>

              <p className="text-sm text-center text-slate-500 mt-5">
                Já tem conta?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Entrar
                </Link>
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
